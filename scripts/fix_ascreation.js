// scripts/import-recursive.js
// Usage: node scripts/import-recursive.js [--dry-run]
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
    // Add timeouts to be more resilient
    readyTimeout: 20000,
    keepalive: 10000
};

const STATE_FILE = 'import_state.json';
const IS_DRY_RUN = process.argv.includes('--dry-run');

// Initialize Clients
const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

// --- STATE MANAGEMENT ---
function loadState() {
    // If user wants to force rescan, return empty state
    if (process.env.FORCE_RESCAN === 'true') {
        console.log('⚠️ FORCE_RESCAN enabled: Ignoring previous state.');
        return { processedFolders: [], processedItems: 0 };
    }

    if (fs.existsSync(STATE_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Corrupt state file, starting fresh.');
            return { processedFolders: [], processedItems: 0 };
        }
    }
    return { processedFolders: [], processedItems: 0 };
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// --- UTILS ---
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
        'Floral': ['floral', 'flower', 'botanic', 'leaf', 'hoja', 'flor', 'nature', 'tropical', 'palm'],
        'Geométrico': ['geometric', 'geo', 'line', 'stripe', 'circle', 'square', 'rayas', 'cuadro', 'modern'],
        'Textura': ['texture', 'plain', 'solid', 'weathered', 'concrete', 'stone', 'piedra', 'liso'],
        'Lujo': ['luxury', 'damask', 'gold', 'metallic', 'dorado', 'ornament', 'baroque', 'elegance'],
        'Vintage': ['vintage', 'retro', 'classic', 'old', 'antiguo'],
        'Infantil': ['kid', 'child', 'baby', 'boy', 'girl', 'bear', 'star', 'infantil']
    };

    for (const [cat, keys] of Object.entries(keywords)) {
        if (keys.some(k => text.includes(k))) return cat;
    }
    return 'General';
}

async function addWatermark(imageBuffer) {
    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        const width = metadata.width || 1000;
        const fontSize = Math.floor(width * 0.05);

        const svgImage = `
        <svg width="${width}" height="${metadata.height}">
          <style>
            .title { 
              fill: rgba(255, 255, 255, 0.5); 
              font-size: ${fontSize}px; 
              font-weight: bold; 
              font-family: 'Didot', 'Bodoni 72', 'Baskerville', 'Times New Roman', serif;
              font-style: italic;
              letter-spacing: 2px;
              stroke: rgba(0, 0, 0, 0.4);
              stroke-width: ${Math.max(1, fontSize * 0.03)}px;
              paint-order: stroke;
            }
          </style>
          <text x="50%" y="50%" text-anchor="middle" class="title">vizzarowallpaper.com</text>
        </svg>
        `;

        return await image
            .composite([{ input: Buffer.from(svgImage), top: 0, left: 0, gravity: 'center' }])
            .toBuffer();
    } catch (error) {
        console.warn('   ⚠️ Watermark failed:', error.message);
        return imageBuffer;
    }
}

// --- MAIN LOGIC (HUNTER MODE) ---

const TARGET_NAME = 'AS Creation - 4022';

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
    console.log(`🚀 Starting BALI FIX for: ${TARGET_NAME}`);

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('✅ FTP Connected');

        // 1. Get Products
        const colKey = `collection:${TARGET_NAME}`;
        const products = await kv.get(colKey);

        if (!products || products.length === 0) {
            console.error('❌ Collection not found in KV');
            return;
        }
        console.log(`📚 Loaded ${products.length} products for ${TARGET_NAME}`);

        // 2. Find Folder
        let rootPath = '/WallpaperBooks/AS Creation';
        if (!await sftp.exists(rootPath)) {
            console.log(`⚠️ Path ${rootPath} not found. Searching...`);
            const books = await sftp.list('/WallpaperBooks');
            const match = books.find(b => b.name.includes('AS Creation') || b.name.includes('Creation'));
            if (match) {
                rootPath = `/WallpaperBooks/${match.name}`;
            } else {
                console.error('❌ Could not find folder.');
                return;
            }
        }
        console.log(`📂 Found Root: ${rootPath}`);

        // 3. Scan
        console.log('🕵️‍♀️ Scanning for images recursively...');
        const allImages = await scanRecursive(rootPath);
        console.log(`📸 Found ${allImages.length} images.`);

        // 4. Match and Update
        let updates = 0;

        for (const p of products) {
            // Skip good ones
            if (p.imageUrl && p.imageUrl.includes('blob') && p.imageUrl.length > 20) continue;

            const cleanId = p.id.replace(p.group + '-', '');
            // Match logic: strictly match cleanID or fullID inside filename
            const match = allImages.find(img => img.name.includes(cleanId) || img.name.includes(p.id));

            if (match) {
                console.log(`🔗 MATCH: ${p.name} (${p.id}) -> ${match.name}`);

                // Read Stream
                const stream = await sftp.get(match.path);

                // Upload
                const blobName = `wallpapers/Advantage_Bali/${match.name}`;
                const blob = await put(blobName, stream, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN
                });

                p.imageUrl = blob.url;
                updates++;
                console.log(`   ☁️ Uploaded: ${blob.url}`);
            }
        }

        // 5. Save
        if (updates > 0) {
            console.log(`💾 Saving ${updates} updates...`);
            await kv.set(colKey, products);

            // Patch Hash
            for (const p of products) {
                if (p.imageUrl) {
                    await kv.hset('wallpapers_catalog_hash', { [p.id]: JSON.stringify(p) });
                }
            }
            console.log('✅ Changes saved to KV.');
        } else {
            console.log('💤 No updates needed.');
        }

    } catch (e) {
        console.error('FATAL:', e);
    } finally {
        sftp.end();
        process.exit(0);
    }
}

main();
