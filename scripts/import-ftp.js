// scripts/import-ftp.js
// Usage: node scripts/import-ftp.js
// Requires .env with: BLOB_READ_WRITE_TOKEN, KV_REST_API_URL, KV_REST_API_TOKEN

require('dotenv').config();
const Client = require('ssh2-sftp-client');
const XLSX = require('xlsx');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const sharp = require('sharp');
const path = require('path');

// Initialize clients
const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1', // Verified correct
};

const EXCEL_FILE = 'All_NewProduct_Data.xlsx';
const IMPORT_LIMIT = 5000; // Modified: Run import for ALL items (5000 safe limit)
const IMAGE_DIR = '/New Products/All Images';

function cleanPrice(priceStr) {
    if (!priceStr) return 0;
    // Remove "MSRP " and symbols, parse float
    return parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
}

function inchToMeter(inchStr) {
    if (!inchStr) return 0;
    const inch = parseFloat(inchStr);
    return isNaN(inch) ? 0 : parseFloat((inch * 0.0254).toFixed(2));
}

async function addWatermark(imageBuffer) {
    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();

        // Create an SVG text overlay
        const width = metadata.width || 1000;
        const fontSize = Math.floor(width * 0.05); // 5% of image width

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
            .composite([
                {
                    input: Buffer.from(svgImage),
                    top: 0,
                    left: 0,
                    gravity: 'center'
                },
            ])
            .toBuffer();
    } catch (error) {
        console.error('   ⚠️ Error adding watermark:', error.message);
        return imageBuffer;
    }
}

async function main() {
    let client;
    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        // 1. Download Excel
        const excelBuffer = await sftp.get(`/New Products/All Data/${EXCEL_FILE}`);
        const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`📊 Found ${data.length} total rows in Excel.`);

        // 2. Filter valid rows
        const validRows = data.filter(r => r['Pattern'] && r['Name']);
        console.log(`🔍 Valid products to process: ${validRows.length}`);

        // 3. Process Items
        let processed = 0;
        let success = 0;
        const limit = IMPORT_LIMIT;

        // 🔹 FETCH EXISTING CATALOG FIRST
        console.log(`💾 Fetching existing catalog from KV...`);
        let existingCatalog = await kv.get('wallpapers_catalog') || [];
        console.log(`   Found ${existingCatalog.length} existing items.`);

        // Create a Map for faster lookup/update by ID
        const catalogMap = new Map();
        existingCatalog.forEach(item => catalogMap.set(item.id, item));

        const displayItems = [];
        const importedProducts = [];

        // Keywords mapping for Smart Categorization
        const STYLE_KEYWORDS = {
            'Floral': ['floral', 'flower', 'botanic', 'leaf', 'hoja', 'flor', 'nature', 'tropical', 'palm'],
            'Geométrico': ['geometric', 'geo', 'line', 'stripe', 'circle', 'square', 'rayas', 'cuadro', 'modern'],
            'Textura': ['texture', 'plain', 'solid', 'weathered', 'concrete', 'stone', 'piedra', 'liso'],
            'Lujo': ['luxury', 'damask', 'gold', 'metallic', 'dorado', 'ornament', 'baroque', 'elegance'],
            'Vintage': ['vintage', 'retro', 'classic', 'old', 'antiguo'],
            'Infantil': ['kid', 'child', 'baby', 'boy', 'girl', 'bear', 'star', 'infantil']
        };

        function determineCategory(row) {
            const text = `${row['Name']} ${row['Description']} ${row['Style']} ${row['Book Name']}`.toLowerCase();

            for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
                if (keywords.some(k => text.includes(k))) {
                    return style;
                }
            }
            return 'General'; // Default
        }

        console.log(`🚀 Starting import (Limit: ${limit === Infinity ? 'Unlimited' : limit})...`);

        // Helper to ensure connection
        async function ensureConnection() {
            try {
                const type = await sftp.list('/'); // Simple check
            } catch (e) {
                console.log('   ⚠️ Connection lost. Reconnecting...');
                await sftp.end();
                await sftp.connect(FTP_CONFIG);
                console.log('   ✅ Reconnected.');
            }
        }

        for (const row of validRows) {
            if (processed >= limit) break;

            try {
                // Ensure connection is alive before starting an item
                // await ensureConnection(); // Checking every item might be slow, let's catch errors instead

                const pattern = row['Pattern'];

                // Add Reconnection Retry Wrapper
                let retries = 3;
                let imageExists = false;
                let roomExists = false;

                while (retries > 0) {
                    try {
                        const imagePath = `${IMAGE_DIR}/${pattern}.jpg`;
                        imageExists = await sftp.exists(imagePath);
                        const roomPath = `${IMAGE_DIR}/${pattern}_Room.jpg`;
                        roomExists = await sftp.exists(roomPath);
                        break; // Success
                    } catch (err) {
                        console.log(`   ⚠️ SFTP Error checking ${pattern}: ${err.message}. Retrying...`);
                        retries--;
                        if (retries === 0) throw err;
                        await sftp.end(); // Close
                        await new Promise(r => setTimeout(r, 5000)); // Wait
                        await sftp.connect(FTP_CONFIG); // Reconnect
                    }
                }

                // 4. Download and Upload Images
                let imageUrl = '';
                let imageUrls = [];

                // Upload Main Image
                if (imageExists) {
                    // Check if we already have it in blob? (Optional optimization, skip for now to ensure update)

                    let imgBuffer;
                    try {
                        imgBuffer = await sftp.get(`${IMAGE_DIR}/${pattern}.jpg`);
                    } catch (err) {
                        // Attempt one reconnect for download
                        console.log('   ⚠️ Download failed. Reconnecting...');
                        await sftp.end();
                        await sftp.connect(FTP_CONFIG);
                        imgBuffer = await sftp.get(`${IMAGE_DIR}/${pattern}.jpg`);
                    }

                    // Watermark
                    imgBuffer = await addWatermark(imgBuffer);

                    const blob = await put(`products/${pattern}.jpg`, imgBuffer, {
                        access: 'public',
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                        addRandomSuffix: false,
                        allowOverwrite: true
                    });
                    imageUrl = blob.url;
                    imageUrls.push(imageUrl);
                    console.log(`      Uploaded Main: ${blob.url}`);
                }

                // Upload Room Scene
                if (roomExists) {
                    let roomBuffer;
                    try {
                        roomBuffer = await sftp.get(`${IMAGE_DIR}/${pattern}_Room.jpg`);
                    } catch (err) {
                        // Reconnect handled in main catch slightly, but granular is better
                        await sftp.end();
                        await sftp.connect(FTP_CONFIG);
                        roomBuffer = await sftp.get(`${IMAGE_DIR}/${pattern}_Room.jpg`);
                    }

                    const blobRoom = await put(`products/${pattern}_Room.jpg`, roomBuffer, {
                        access: 'public',
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                        addRandomSuffix: false,
                        allowOverwrite: true
                    });
                    imageUrls.push(blobRoom.url);
                    console.log(`      Uploaded Room: ${blobRoom.url}`);
                }

                if (!imageUrl) {
                    console.log(`   ⚠️ Main image not found for ${pattern}`);
                }

                // 5. Build Product Object with Smart Category
                const widthMeters = inchToMeter(row['Product Width']);
                const lengthMeters = inchToMeter(row['Product Length']);
                const coverage = (widthMeters && lengthMeters) ? (widthMeters * lengthMeters).toFixed(2) : '0';

                const smartCategory = determineCategory(row);

                const product = {
                    id: pattern,
                    name: row['Name'] || 'Untitled Wallpaper',
                    description: row['Description'] || '',
                    price: cleanPrice(row['MSRP']),
                    category: smartCategory,
                    style: row['Style'] || 'General',
                    colors: row['Color Family'] ? [row['Color Family']] : [],
                    dimensions: {
                        width: widthMeters,
                        height: lengthMeters,
                        coverage: coverage,
                        weight: parseFloat(row['Weight'] || 0),
                    },
                    specifications: {
                        material: row['Material'] || 'Unknown',
                        washable: true,
                        removable: true,
                        textured: false,
                    },
                    imageUrl: imageUrl || '',
                    imageUrls: imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
                    inStock: true,
                    rating: 0,
                    reviews: 0,
                    showInHome: true,
                    brand: row['Brand'],
                    origin: row['Country of Origin'],
                    publicSku: `VIZ-${pattern}`
                };

                // Add to map and list
                catalogMap.set(product.id, product);
                importedProducts.push(product);
                displayItems.push(`   + [${processed}] ${product.name} (${product.id})`);

                processed++;

                // INCREMENTAL SAVE (Batch of 50)
                if (processed % 50 === 0) {
                    console.log(`💾 Batch Save: Updating catalog with ${importedProducts.length} items so far...`);
                    // We save the WHOLE accumulation, not just the batch, to ensure integrity if we stop
                    // Ideally we'd merge with existing, but here we are building `importedProducts` as the new master list?
                    // Wait, if we crash and restart, `importedProducts` starts empty.
                    // So we should MERGE `importedProducts` into `existingCatalog` (or `catalogMap`) and save THAT.
                    const currentFullList = Array.from(catalogMap.values());
                    await kv.set('wallpapers_catalog', currentFullList);
                    console.log(`   ✅ Saved ${currentFullList.length} items to KV.`);
                }

            } catch (loopErr) {
                console.error(`❌ Error processing row ${row['Pattern']}:`, loopErr.message);
                // Try to reconnect once more to ensure next loop has a chance
                try { await sftp.end(); await sftp.connect(FTP_CONFIG); } catch (e) { }
            }
        }

        console.log(`✨ Import completed! Processed ${processed} items.`);
        console.log(`📝 Summary:`);
        // console.log(displayItems.join('\n')); // Too verbose

        console.log(`📚 Final Update of Main Catalog Index...`);
        const finalCatalog = Array.from(catalogMap.values());
        await kv.set('wallpapers_catalog', finalCatalog);
        console.log(`✅ Catalog updated with ${finalCatalog.length} items.`);

    } catch (err) {
        console.error('❌ Import failed fatal:', err);
    } finally {
        sftp.end();
    }
}

main();
