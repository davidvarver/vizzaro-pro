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
    if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
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
              font-family: sans-serif;
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

// --- MAIN LOGIC ---

async function traverse(currentPath, state) {
    console.log(`📂 Scanning: ${currentPath}`);

    // Check if this folder is an "Exclusion" folder
    if (['/Trash', 'All Images', 'All Wallpaper Images', '/Logs', '/thumbnails', 'Collection_Images'].some(p => currentPath.includes(p))) {
        return;
    }

    let items;
    try {
        items = await sftp.list(currentPath);
    } catch (e) {
        console.error(`   ❌ Cannot access ${currentPath}: ${e.message}`);
        return;
    }

    // Segregate items
    const subdirs = items.filter(i => i.type === 'd');
    const files = items.filter(i => i.type === '-');

    // 1. CHECK FOR DATA FILES (Excel/CSV)
    const dataFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.csv'));

    if (dataFiles.length > 0) {
        // THIS IS A COLLECTION FOLDER!
        if (state.processedFolders.includes(currentPath)) {
            console.log(`   ⏭️ Skipping processed folder: ${currentPath}`);
        } else {
            console.log(`   💎 Found Collection Data in: ${currentPath}`);
            const collectionName = path.basename(currentPath); // FOLDER NAME = COLLECTION NAME

            for (const file of dataFiles) {
                await processCollection(currentPath, file.name, collectionName, files, state);
            }

            // Mark folder as done
            state.processedFolders.push(currentPath);
            saveState(state);
        }
    }

    // 2. RECURSE
    for (const dir of subdirs) {
        // Prevent going too deep if not needed, or cycles
        const nextPath = currentPath === '/' ? `/${dir.name}` : `${currentPath}/${dir.name}`;
        await traverse(nextPath, state);
    }
}

async function processCollection(dirPath, fileName, collectionName, filesInFolder, state) {
    console.log(`      Processing Collection: "${collectionName}" from ${fileName}`);
    // if (IS_DRY_RUN) return; // Allow reading for debug

    // 1. Download Excel
    let data = [];
    try {
        const filePath = `${dirPath}/${fileName}`;
        const buffer = await sftp.get(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(sheet);
    } catch (e) {
        console.error(`      ❌ Failed to read excel ${fileName}: ${e.message}`);
        return;
    }

    // DEBUG: Log headers
    if (data.length > 0) {
        console.log('      📊 Headers:', Object.keys(data[0]).join(', '));
        console.log('      👀 First Row:', JSON.stringify(data[0]));
    }

    const validRows = data.filter(r => r['Pattern'] && r['Name']);
    console.log(`      Found ${validRows.length} valid items (out of ${data.length} total rows).`);

    // 2. Process Items
    const newItems = [];

    for (const row of validRows) {
        const pattern = row['Pattern'];

        // Find Image in SAME folder (or assume typical naming)
        // Checks: Pattern.jpg, Pattern_Room.jpg
        const mainImgName = itemsFindFirst(filesInFolder, [
            `${pattern}.jpg`, `${pattern}.jpeg`,
            `${pattern}.png`, `MD${pattern}.jpg` // Some providers prefix
        ]);

        const roomImgName = itemsFindFirst(filesInFolder, [
            `${pattern}_Room.jpg`, `${pattern}_room.jpg`
        ]);

        let imageUrl = '';
        let imageUrls = [];

        // Upload Logic
        if (mainImgName && !IS_DRY_RUN) {
            // Check if already uploaded (optimization: skip if blob exists? No, hard to check efficiently without map. 
            // We'll trust Vercel Blob dedup or just overwrite for now to be safe)
            try {
                // Download from FTP
                let imgBuf = await sftp.get(`${dirPath}/${mainImgName}`);
                imgBuf = await addWatermark(imgBuf);
                const blob = await put(`products/${collectionName}/${pattern}.jpg`, imgBuf, {
                    access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false
                });
                imageUrl = blob.url;
                imageUrls.push(imageUrl);
                process.stdout.write('.');
            } catch (e) {
                console.warn(`         ⚠️ Image upload failed for ${pattern}: ${e.message}`);
            }
        }

        if (roomImgName && !IS_DRY_RUN) {
            try {
                let roomBuf = await sftp.get(`${dirPath}/${roomImgName}`);
                const blob = await put(`products/${collectionName}/${pattern}_room.jpg`, roomBuf, {
                    access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false
                });
                imageUrls.push(blob.url);
            } catch (e) { }
        }

        // Build Product
        const widthMeters = inchToMeter(row['Product Width']);
        const lengthMeters = inchToMeter(row['Product Length']);

        const product = {
            id: pattern.toString(),
            name: row['Name'],
            description: row['Description'] || '',
            price: cleanPrice(row['MSRP']),
            category: determineCategory(row, collectionName),
            collection: collectionName, // <--- NEW FIELD
            style: row['Style'] || 'General',
            dimensions: {
                width: widthMeters,
                height: lengthMeters,
                weight: parseFloat(row['Weight'] || 0)
            },
            imageUrl: imageUrl,
            imageUrls: imageUrls,
            inStock: true,
            publicSku: `VIZ-${pattern}`,
            patternRepeat: cleanPrice(row['Repeat']),
            timestamp: Date.now()
        };

        newItems.push(product);
    }

    if (newItems.length > 0) {
        if (IS_DRY_RUN) {
            console.log(`      [DRY RUN] Would save ${newItems.length} items to KV.`);
            return;
        }
        // Save to KV (Append/Merge mode)
        // We fetch current catalog, merge, and save back. 
        // LOCKING ISSUE: If we do this for every collection, it might be slow.
        // BETTER: Use a separate key per collection? No, catalog must be unified.
        // STRATEGY: Fetch, Map, Merge, Save.
        try {
            const currentCatalog = (await kv.get('wallpapers_catalog')) || [];
            const catalogMap = new Map(currentCatalog.map(i => [i.id, i]));

            let addedCount = 0;
            newItems.forEach(item => {
                catalogMap.set(item.id, item); // Overwrite/Update
                addedCount++;
            });

            await kv.set('wallpapers_catalog', Array.from(catalogMap.values()));
            console.log(`\n      ✅ Saved ${addedCount} items to Catalog from ${collectionName}`);

            state.processedItems += addedCount;
            saveState(state);

        } catch (e) {
            console.error('      ❌ KV Verification Failed:', e.message);
        }
    }
}

function itemsFindFirst(files, searchNames) {
    for (const name of searchNames) {
        const found = files.find(f => f.name.toLowerCase() === name.toLowerCase());
        if (found) return found.name;
    }
    return null;
}

// Start
async function main() {
    console.log(`🚀 Starting Recursive Import (${IS_DRY_RUN ? 'DRY RUN' : 'LIVE'})...`);
    if (!IS_DRY_RUN) {
        const state = loadState();
        console.log(`   Resuming from: ${state.processedFolders.length} folders processed.`);
    }

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('   Connected to FTP.');

        const state = IS_DRY_RUN ? { processedFolders: [], processedItems: 0 } : loadState();
        const startPath = process.env.TARGET_FOLDER || '/';
        console.log(`   🎯 Starting scan at: ${startPath}`);
        await traverse(startPath, state);

        console.log('\n✨ Import Complete!');
    } catch (e) {
        console.error('\n❌ Fatal Error:', e.message);
    } finally {
        sftp.end();
    }
}

main();
