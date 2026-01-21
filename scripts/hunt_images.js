console.log('Script Init...');
require('dotenv').config();
console.log('Dotenv OK');

const SftpClient = require('ssh2-sftp-client');
console.log('SFTP Client OK');
const { createClient } = require('@vercel/kv');
console.log('KV Client OK');
const { put } = require('@vercel/blob');
console.log('Blob Client OK');
const path = require('path');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const sftp = new SftpClient();

const FTP_CONFIG = {
    host: process.env.FTP_HOST,
    port: parseInt(process.env.FTP_PORT) || 22,
    username: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
};

const TARGET_COLLECTION_NAME = 'Advantage Bali';

async function main() {
    console.log(`🚀 Starting Hunter for: ${TARGET_COLLECTION_NAME}`);

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
            const books = await sftp.list('/WallpaperBooks');
            const match = books.find(b => b.name.includes('Bali'));
            if (match) {
                rootPath = `/WallpaperBooks/${match.name}`;
                console.log(`✅ Found folder: ${rootPath}`);
            } else {
                console.error('❌ Could not locate folder for Advantage Bali');
                // Try one more fallback common in logs
                rootPath = '/WallpaperBooks/Advantage Select/Advantage Bali - 2814';
                if (await sftp.exists(rootPath)) {
                    console.log(`✅ Found fallback folder: ${rootPath}`);
                } else {
                    return;
                }
            }
        }

        // 3. Scan Images (Recursive)
        console.log(`📂 Scanning: ${rootPath}`);
        const imageFiles = [];
        const dirsToVisit = [rootPath];

        while (dirsToVisit.length > 0) {
            const currentDir = dirsToVisit.pop();
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
            // Skip if already has valid image
            if (product.imageUrl && product.imageUrl.length > 20) continue;

            const cleanId = product.id.replace(product.group + '-', '');
            // Match logic: filename contains cleanId OR product.id
            const match = imageFiles.find(img => img.name.includes(cleanId) || img.name.includes(product.id));

            if (match) {
                console.log(`🔗 MATCH: ${product.name} -> ${match.name}`);

                // Upload
                const blobName = `wallpapers/${TARGET_COLLECTION_NAME}/${match.name}`;
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
            // Patch main hash
            for (const item of items) {
                if (item.imageUrl) {
                    // Update only if we touched it? 
                    // Actually we iterated all. Any with imageUrl gets saved just in case? 
                    // No, efficiently: checking strict equality might be hard.
                    // Just save the ones we matched?
                    // "product" is a reference to object in items array.
                    // We only updated "product.imageUrl" inside the loop for MATCHES.
                    // So we scan items again? Or just track them?
                    // Let's just Loop items again.
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
        await sftp.end();
    }
}

main();
