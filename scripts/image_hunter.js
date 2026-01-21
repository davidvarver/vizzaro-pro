require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// --- CONFIG ---
const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
    readyTimeout: 20000,
    keepalive: 10000
};

// Initialize Clients
const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const TARGET_NAME = process.argv[2] || 'Advantage Bath';

// --- UTILS ---
function cleanPrice(priceStr) {
    if (!priceStr) return 0;
    return parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
}

async function scanRecursive(dirPath, fileList = []) {
    try {
        const items = await sftp.list(dirPath);
        for (const item of items) {
            if (item.type === 'd' && item.name !== '.' && item.name !== '..') {
                await scanRecursive(`${dirPath}/${item.name}`, fileList);
            } else if (item.name.match(/\.(jpg|jpeg|png)$/i)) {
                fileList.push({
                    name: item.name,
                    path: `${dirPath}/${item.name}`,
                    size: item.size
                });
            }
        }
    } catch (e) {
        console.warn(`⚠️ Error scanning ${dirPath}: ${e.message}`);
    }
    return fileList;
}

async function main() {
    console.log(`🚀 Starting IMAGE HUNTER (Excel-Enhanced) for: ${TARGET_NAME}`);

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('✅ FTP Connected');

        // 1. Find Folder
        let rootPath = `/WallpaperBooks/${TARGET_NAME}`;
        if (!await sftp.exists(rootPath)) {
            console.log(`⚠️ Path ${rootPath} not found. Searching in /WallpaperBooks...`);
            const books = await sftp.list('/WallpaperBooks');
            let match = books.find(b => b.name.toLowerCase().includes(TARGET_NAME.toLowerCase()));
            if (!match) {
                const keywords = TARGET_NAME.split(' ').filter(w => w.length > 3);
                match = books.find(b => keywords.some(k => b.name.toLowerCase().includes(k.toLowerCase())));
            }
            if (match) {
                rootPath = `/WallpaperBooks/${match.name}`;
            } else {
                console.error(`❌ Could not find folder for ${TARGET_NAME}`);
                return;
            }
        }
        console.log(`📂 Found Root: ${rootPath}`);

        // 2. SEARCH FOR EXCEL DATA
        console.log('🕵️‍♀️ Checking for Excel data files...');
        const rootItems = await sftp.list(rootPath);
        const excelFile = rootItems.find(f => f.name.endsWith('.xlsx'));
        let excelData = [];

        if (excelFile) {
            console.log(`📊 Found Excel Data: ${excelFile.name}. Downloading & Parsing...`);
            const buffer = await sftp.get(`${rootPath}/${excelFile.name}`);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(sheet);

            // Map to Pattern -> Metadata
            excelData = rawData.filter(r => r.Pattern).map(r => ({
                id: String(r.Pattern),
                name: r.Name || `${TARGET_NAME} - ${r.Pattern}`,
                description: r.Description || '',
                price: cleanPrice(r.MSRP),
                collection: TARGET_NAME,
                brand: 'Vizzaro' // or derive from row
            }));
            console.log(`✅ Parsed ${excelData.length} products from Excel.`);
        } else {
            console.log('⚠️ No Excel file found. Will failback to basic filename matching.');
        }

        // 3. Scan Images
        console.log('🕵️‍♀️ Scanning for images recursively...');
        const allImages = await scanRecursive(rootPath);
        console.log(`📸 Found ${allImages.length} images.`);

        // 4. MATCHING LOGIC
        // Priority: Excel Data > Existing KV Data > Ghost Creation

        let finalProducts = [];
        let updates = 0;

        if (excelData.length > 0) {
            console.log('🔄 Matching Images to Excel Data...');

            for (const item of excelData) {
                // Find image for this pattern
                // Logic: Image name usually contains the pattern ID
                // e.g. Pattern "2814-123" -> Image "2814-123_Room.jpg" or "2814-123.jpg"

                // Flexible match
                const match = allImages.find(img => img.name.includes(item.id));

                if (match) {
                    console.log(`✨ Matched: ${item.id} -> ${match.name} ($${item.price})`);

                    try {
                        const buffer = await sftp.get(match.path);
                        console.log(`   📦 Downloaded ${buffer.length} bytes. Uploading...`);

                        const blobName = `wallpapers/${TARGET_NAME.replace(/\s+/g, '_')}/${match.name}`;
                        const blob = await put(blobName, buffer, {
                            access: 'public',
                            token: process.env.BLOB_READ_WRITE_TOKEN
                        });

                        item.imageUrl = blob.url;
                        item.width = 0.53;
                        item.length = 10.05;

                        finalProducts.push(item);
                        updates++;
                        console.log(`   ☁️ Uploaded: ${blob.url}`);
                    } catch (err) {
                        console.error(`   ❌ FAIL for ${match.name}:`, err);
                    }
                } else {
                    // Item in Excel but no image? Skip or add without image? 
                    // Add without image so it exists in catalog at least
                    // finalProducts.push(item); // Optional
                }
            }
        } else {
            console.log('⚠️ No Excel file found. Attempting Hash Rescue...');

            // HASH RESCUE STRATEGY
            // 1. Try to load rich metadata from 'wallpapers_catalog_hash'
            // 2. If found, match images to it.
            // 3. If not found, use Ghost Mode (create from file list).

            let rescueItems = [];
            try {
                const hashData = await kv.hgetall('wallpapers_catalog_hash');
                if (hashData) {
                    Object.values(hashData).forEach(raw => {
                        try {
                            const item = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (item && item.collection === TARGET_NAME) {
                                rescueItems.push(item);
                            } else if (item && item.name && item.name.startsWith(TARGET_NAME + ' -')) {
                                rescueItems.push(item);
                            }
                        } catch (e) { }
                    });
                }
            } catch (e) { console.warn('Hash lookup failed:', e); }

            if (rescueItems.length > 0) {
                console.log(`✅ HASH RESCUE: Found ${rescueItems.length} existing items. Preserving metadata.`);

                for (const item of rescueItems) {
                    const cleanId = item.id.replace(item.collection + '-', '').replace(/\s/g, '');
                    // Match image
                    const match = allImages.find(img => img.name.includes(item.id) || img.name.includes(cleanId));

                    if (match && (!item.imageUrl || item.imageUrl.length < 20 || item.price === 0)) {
                        console.log(`✨ Matched (Hash): ${item.id} -> ${match.name}`);
                        try {
                            const buffer = await sftp.get(match.path);
                            const blobName = `wallpapers/${TARGET_NAME.replace(/\s+/g, '_')}/${match.name}`;
                            const blob = await put(blobName, buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
                            item.imageUrl = blob.url;
                            finalProducts.push(item);
                            updates++;
                            console.log(`   ☁️ Uploaded: ${blob.url}`);
                        } catch (err) {
                            console.error(`   ❌ FAIL for ${match.name}:`, err.message);
                        }
                    }
                }
            } else {
                // TRUE GHOST MODE (Last Resort)
                console.log('👻 No Hash Data. Using standard Ghost/KV Recovery...');
                for (const img of allImages) {
                    const basename = path.basename(img.name, path.extname(img.name));
                    const id = basename.split('_')[0];

                    console.log(`👻 Creating Ghost: ${id}`);
                    try {
                        const buffer = await sftp.get(img.path);
                        const blobName = `wallpapers/${TARGET_NAME.replace(/\s+/g, '_')}/${img.name}`;
                        const blob = await put(blobName, buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });

                        finalProducts.push({
                            id: id,
                            name: `${TARGET_NAME} - ${id}`,
                            collection: TARGET_NAME,
                            price: 0,
                            imageUrl: blob.url
                        });
                        updates++;
                    } catch (err) {
                        console.error(`   ❌ FAIL for ${img.name}:`, err.message);
                    }
                }
            }
        }

        // 5. SAVE
        if (updates > 0) {
            const colKey = `collection:${TARGET_NAME}`;
            console.log(`💾 Saving ${finalProducts.length} items to ${colKey}...`);
            await kv.set(colKey, finalProducts);

            // Patch Hash
            let hashUpdates = {};
            for (const p of finalProducts) {
                hashUpdates[p.id] = JSON.stringify(p);
            }
            if (Object.keys(hashUpdates).length > 0) {
                await kv.hset('wallpapers_catalog_hash', hashUpdates);
            }
            console.log('✅ Changes saved to KV.');
        } else {
            console.log('💤 No valid matches found.');
        }

    } catch (e) {
        console.error('FATAL:', e);
    } finally {
        sftp.end();
        process.exit(0);
    }
}

main();
