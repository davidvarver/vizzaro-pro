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

    // 1. List ALL files in folder (including subdirectories) to check for /Images
    let allItems = await sftp.list(dirPath);
    filesInFolder = allItems; // Default to current folder items (REASSIGN PARAMETER)

    // CHECK: If folder has no images but has a subfolder named 'Images', switch to it!
    const hasImages = allItems.some(f => f.name.toLowerCase().endsWith('.jpg'));
    const imagesSubfolder = allItems.find(f => f.name.toLowerCase() === 'images' && f.type === 'd');

    if (!hasImages && imagesSubfolder) {
        console.log(`    📂 Switching to scan subfolder: ${dirPath}/Images`);
        // Update directory path to the subfolder for image searching
        // Note: We keeping 'dirPath' as base, but we'll fetch files from subfolder
        const subPath = `${dirPath}/${imagesSubfolder.name}`;
        const subFiles = await sftp.list(subPath); // Fix: Use sftp.list directly

        // Merge files (prioritize subfolder images)
        // Ideally we just want to look there for images.
        console.log(`    Found ${subFiles.length} items in /Images subfolder.`);

        // We'll trust the subfolder list for image finding
        filesInFolder = subFiles;
        // Update dirPath for sftp.get() calls later
        dirPath = subPath;
    }

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
        let pattern = String(row['Pattern']); // Force string to avoid .includes crashes

        // 2a. Find Main Image
        // Try standard naming + "Pattern Only" naming (e.g. 520255.jpg instead of 4096-520255.jpg)
        const barePattern = pattern.includes('-') ? pattern.split('-')[1] : pattern;
        const mainCandidates = [
            `${pattern}.jpg`, `${pattern}.jpeg`, `${pattern}.png`, `MD${pattern}.jpg`,
            `${barePattern}.jpg`, `${barePattern}.jpeg` // <--- NEW FALLBACKS
        ];
        const mainImgName = itemsFindFirst(filesInFolder, mainCandidates);

        if (!mainImgName) {
            console.log(`\n⚠️  [${pattern}] Image NOT found. Candidates: ${mainCandidates.join(', ')}`);
            if (filesInFolder.length > 0) {
                console.log(`    Available files (first 5): ${filesInFolder.slice(0, 5).map(f => f.name).join(', ')}`);
            } else {
                console.log('    Folder is EMPTY.');
            }
        }

        // 2b. Find Extra Variants (Room, Detail, Numbered)
        const variantsToCheck = [
            { suffix: '_Room', label: 'Room' },
            { suffix: '_room', label: 'Room' },
            { suffix: '_Detail', label: 'Detail' },
            { suffix: '_detail', label: 'Detail' },
            { suffix: '_Alt', label: 'Alt' },
            { suffix: '_alt', label: 'Alt' },
            { suffix: '_2', label: 'Var 2' },
            { suffix: '_3', label: 'Var 3' },
            { suffix: '_4', label: 'Var 4' },
            { suffix: '_5', label: 'Var 5' },
            { suffix: '-2', label: 'Var 2' },
            { suffix: '-3', label: 'Var 3' }
        ];

        let foundVariants = [];
        for (const v of variantsToCheck) {
            const candName = `${pattern}${v.suffix}.jpg`;
            const matchName = itemsFindFirst(filesInFolder, [candName]); // Reuse itemFinder
            if (matchName) {
                // Avoid duplicates if multiple suffixes match same file (unlikely but safe)
                if (!foundVariants.some(fv => fv.name === matchName)) {
                    foundVariants.push({ name: matchName, label: v.label });
                }
            }
        }

        let imageUrl = '';
        let imageUrls = [];

        // Upload Main
        if (mainImgName && !IS_DRY_RUN) {
            try {
                let imgBuf = await sftp.get(`${dirPath}/${mainImgName}`);
                imgBuf = await addWatermark(imgBuf);
                const blob = await put(`products/${collectionName}/${pattern}.jpg`, imgBuf, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                    addRandomSuffix: false,
                    contentType: 'image/jpeg',
                    allowOverwrite: true, // Fix: Actually enabled now
                });
                imageUrl = blob.url;
                imageUrls.push(imageUrl);
                process.stdout.write('.');
            } catch (e) {
                console.warn(`         ⚠️ Image upload failed for ${pattern}: ${e.message}`);
            }
        }

        // Upload Variants
        if (!IS_DRY_RUN) {
            for (const v of foundVariants) {
                try {
                    let vBuf = await sftp.get(`${dirPath}/${v.name}`);
                    // Optional: Add watermark to room scenes? Yes.
                    // if (v.label === 'Room') vBuf = await addWatermark(vBuf); 

                    const blob = await put(`products/${collectionName}/${v.name}`, vBuf, {
                        access: 'public',
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                        addRandomSuffix: false,
                        contentType: 'image/jpeg',
                        allowOverwrite: true, // Fix: Actually enabled now
                    });
                    if (!imageUrls.includes(blob.url)) {
                        imageUrls.push(blob.url);
                    }
                } catch (e) {
                    console.warn(`         ⚠️ Variant upload failed for ${v.name}: ${e.message}`);
                }
            }
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

        // Save to KV (ATOMIC HASH UPDATE)
        // We write each item to the Hash map 'wallpapers_catalog_hash'
        // This avoids the 10MB request limit.
        try {
            console.log(`      💾 Saving ${newItems.length} items to Hash...`);
            let savedCount = 0;

            for (const item of newItems) {
                // Determine if we need to update
                // Optional: Check if hash already has it? 
                // For now, we overwrite to ensure latest data from FTP.

                await kv.hset('wallpapers_catalog_hash', { [item.id]: item });
                savedCount++;
                process.stdout.write('+'); // Progress indicator
            }

            console.log(`\n      ✅ Saved ${savedCount} items from ${collectionName}`);

            state.processedItems += savedCount;
            saveState(state);

        } catch (e) {
            console.error('      ❌ KV Hash Save Failed:', e.message);
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
