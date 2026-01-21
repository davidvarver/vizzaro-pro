console.log('Script Init...');

let SftpClient, createClient, put, path;
let kv;

try {
    require('dotenv').config();
    console.log('1. Dotenv OK');

    // Explicitly assigning to outer variables
    const kvModule = require('@vercel/kv');
    createClient = kvModule.createClient;
    console.log('2. KV OK');

    const blobModule = require('@vercel/blob');
    put = blobModule.put;
    console.log('3. Blob OK');

    SftpClient = require('ssh2-sftp-client');
    console.log('4. SFTP OK');

    path = require('path');

} catch (e) {
    console.error('CRITICAL IMPORT ERROR:', e);
    process.exit(1);
}

// Init KV
try {
    kv = createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });
    console.log('KV Initialized');
} catch (e) {
    console.error('KV INIT ERROR:', e);
}

const FTP_CONFIG = {
    host: process.env.FTP_HOST,
    port: parseInt(process.env.FTP_PORT) || 22,
    username: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
};

const TARGET_COLLECTION_NAME = 'Advantage Bali';

async function main() {
    console.log(`🚀 Starting Hunter for: ${TARGET_COLLECTION_NAME}`);
    const sftp = new SftpClient();

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('🔌 FTP Connected');

        // 1. Get KV Items
        const colKey = `collection:${TARGET_COLLECTION_NAME}`;
        const items = await kv.get(colKey);

        if (!items || items.length === 0) {
            console.error('❌ Collection items not found in KV');
            return;
        }
        console.log(`📚 Loaded ${items.length} items from KV`);

        // 2. Find Folder
        let rootPath = '/WallpaperBooks/A-Street Select - 4021/Advantage Bali';
        const exists = await sftp.exists(rootPath);
        if (!exists) {
            console.log(`⚠️ Root path ${rootPath} not found. Searching...`);
            rootPath = '/WallpaperBooks/Advantage Select/Advantage Bali - 2814';
            if (await sftp.exists(rootPath)) {
                console.log(`✅ Found fallback folder: ${rootPath}`);
            } else {
                const books = await sftp.list('/WallpaperBooks');
                const match = books.find(b => b.name.includes('Bali'));
                if (match) {
                    rootPath = `/WallpaperBooks/${match.name}`;
                    console.log(`✅ Found folder via List: ${rootPath}`);
                } else {
                    console.error('❌ Could not locate folder for Advantage Bali');
                    return;
                }
            }
        }

        // 3. Scan Images (Recursive)
        console.log(`📂 Scanning: ${rootPath}`);
        const imageFiles = [];
        const dirsToVisit = [rootPath];
        const scannedDirs = new Set();

        while (dirsToVisit.length > 0) {
            const currentDir = dirsToVisit.pop();
            if (scannedDirs.has(currentDir)) continue;
            scannedDirs.add(currentDir);

            try {
                const list = await sftp.list(currentDir);
                for (const item of list) {
                    if (item.type === 'd') {
                        if (item.name !== '.' && item.name !== '..') {
                            dirsToVisit.push(`${currentDir}/${item.name}`);
                        }
                    } else if (item.name.match(/\.(jpg|jpeg|png)$/i)) {
                        imageFiles.push({
                            path: `${currentDir}/${item.name}`,
                            name: item.name
                        });
                    }
                }
            } catch (err) {
                console.warn(`   Warning reading ${currentDir}:`, err.message);
            }
        }
        console.log(`📸 Found ${imageFiles.length} images.`);

        // 4. Match
        let updatedCount = 0;
        for (const product of items) {
            if (product.imageUrl && product.imageUrl.length > 20) continue;

            const cleanId = product.id.replace(product.group + '-', '');
            const match = imageFiles.find(img => img.name.includes(cleanId) || img.name.includes(product.id));

            if (match) {
                console.log(`🔗 MATCH: ${product.name} -> ${match.name}`);

                const blobName = `wallpapers/${TARGET_COLLECTION_NAME.replace(/\s+/g, '_')}/${match.name}`;
                const stream = await sftp.get(match.path);
                const blob = await put(blobName, stream, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN
                });

                console.log(`   ☁️ Uploaded: ${blob.url}`);
                product.imageUrl = blob.url;
                updatedCount++;
            }
        }

        // 5. Save
        if (updatedCount > 0) {
            console.log(`💾 Saving ${updatedCount} updates...`);
            await kv.set(colKey, items);
            for (const item of items) {
                if (item.imageUrl) {
                    await kv.hset('wallpapers_catalog_hash', { [item.id]: JSON.stringify(item) });
                }
            }
            console.log('✅ Done saving.');
        } else {
            console.log('No matches found to update.');
        }

    } catch (e) {
        console.error('FATAL:', e);
    } finally {
        if (sftp) await sftp.end();
        process.exit(0);
    }
}

main();
