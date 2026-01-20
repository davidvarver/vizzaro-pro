// scripts/import_stable.js
// BASED ON import-recursive.js but SIMPLIFIED
require('dotenv').config();
const Client = require('ssh2-sftp-client');
const XLSX = require('xlsx');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const sharp = require('sharp');
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

const IS_DRY_RUN = process.argv.includes('--dry-run');

const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

function cleanPrice(priceStr) {
    if (!priceStr) return 0;
    return parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
}

function inchToMeter(inchStr) {
    if (!inchStr) return 0;
    const inch = parseFloat(inchStr);
    return isNaN(inch) ? 0 : parseFloat((inch * 0.0254).toFixed(2));
}

function determineCategory(row, collectionName) {
    const text = `${row['Name']} ${row['Description']} ${row['Style']} ${collectionName}`.toLowerCase();
    const keywords = {
        'Floral': ['floral', 'flower'],
        'Textura': ['texture', 'plain'],
        'Infantil': ['kid', 'child']
    };
    for (const [cat, keys] of Object.entries(keywords)) {
        if (keys.some(k => text.includes(k))) return cat;
    }
    return 'General';
}

async function addWatermark(imageBuffer) {
    // Keep watermark logic as it's nice
    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        const width = metadata.width || 1000;
        const fontSize = Math.floor(width * 0.05);
        const svgImage = `
        <svg width="${width}" height="${metadata.height}">
          <style>
            .title { fill: rgba(255, 255, 255, 0.5); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" class="title">vizzarowallpaper.com</text>
        </svg>`;
        return await image.composite([{ input: Buffer.from(svgImage), top: 0, left: 0, gravity: 'center' }]).toBuffer();
    } catch { return imageBuffer; }
}

async function traverse(currentPath) {
    console.log(`📂 Scanning: ${currentPath}`);
    if (['/Trash', 'All Images'].some(p => currentPath.includes(p))) return;

    let items;
    try {
        items = await sftp.list(currentPath);
    } catch (e) {
        console.error(`   ❌ Cannot access ${currentPath}`);
        return;
    }

    const files = items.filter(i => i.type === '-');
    const dataFiles = files.filter(f => f.name.endsWith('.xlsx'));

    if (dataFiles.length > 0) {
        const collectionName = path.basename(currentPath);
        for (const file of dataFiles) {
            await processCollection(currentPath, file.name, collectionName, items);
        }
    }

    // RECURSE (For folder structure traversal only, NOT checking subfolders for files of current collection)
    const subdirs = items.filter(i => i.type === 'd');
    for (const dir of subdirs) {
        const nextPath = currentPath === '/' ? `/${dir.name}` : `${currentPath}/${dir.name}`;
        await traverse(nextPath);
    }
}

async function processCollection(dirPath, fileName, collectionName, itemsInFolder) {
    console.log(`      Processing Collection: "${collectionName}" from ${fileName}`);

    // SIMPLE MODE: Only look at itemsInFolder. NO subfolder switching.
    let filesInFolder = itemsInFolder;

    // Download Excel
    let data = [];
    try {
        const buffer = await sftp.get(`${dirPath}/${fileName}`);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(sheet);
    } catch (e) {
        return;
    }

    const newItems = [];
    for (const row of data) {
        if (!row['Pattern']) continue;
        let pattern = String(row['Pattern']);

        const barePattern = pattern.includes('-') ? pattern.split('-')[1] : pattern;
        const candidates = [`${pattern}.jpg`, `${barePattern}.jpg`, `${pattern}.jpeg`];

        const found = filesInFolder.find(f => candidates.some(c => f.name.toLowerCase() === c.toLowerCase()));

        let imageUrl = '';
        if (found) {
            try {
                let imgBuf = await sftp.get(`${dirPath}/${found.name}`);
                imgBuf = await addWatermark(imgBuf);
                const blob = await put(`products/${collectionName}/${found.name}`, imgBuf, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                    allowOverwrite: true,
                });
                imageUrl = blob.url;
                process.stdout.write('+');
            } catch (e) { process.stdout.write('x'); }
        } else {
            process.stdout.write('.');
        }

        const product = {
            id: pattern,
            name: row['Name'],
            collection: collectionName,
            description: row['Description'] || '',
            price: cleanPrice(row['MSRP']),
            imageUrl: imageUrl,
            timestamp: Date.now()
        };
        newItems.push(product);
    }

    if (newItems.length > 0) {
        try {
            console.log(`\n      💾 Saving ${newItems.length} items...`);
            for (const item of newItems) {
                await kv.hset('wallpapers_catalog_hash', { [item.id]: item });
            }
        } catch { }
    }
}

async function main() {
    console.log('🚀 Starting STABLE Simple Import...');
    try {
        await sftp.connect(FTP_CONFIG);
        await traverse('/');
        console.log('\n✨ Import Complete!');
    } catch (e) {
        console.error('Fatal:', e);
    } finally {
        sftp.end();
    }
}
main();
