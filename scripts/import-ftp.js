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
const IMPORT_LIMIT = 150; // Modified: Run import for 150 items
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

        console.log(`🚀 Starting import (Limit: ${limit === Infinity ? 'Unlimited' : limit})...`);

        for (const row of validRows) {
            if (processed >= limit) break;

            const pattern = row['Pattern'];
            // Check if image exists in FTP
            const imagePath = `${IMAGE_DIR}/${pattern}.jpg`;
            const imageExists = await sftp.exists(imagePath);

            // 4. Download and Upload Image to Blob
            let imageUrl = '';
            if (imageExists) {
                console.log(`   📸 Found image: ${imagePath}. Uploading to Blob...`);
                // Stream upload
                let imgBuffer = await sftp.get(imagePath);

                console.log(`   💧 Adding watermark...`);
                imgBuffer = await addWatermark(imgBuffer);

                const blob = await put(`products/${pattern}.jpg`, imgBuffer, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                    addRandomSuffix: false,
                    allowOverwrite: true
                });
                imageUrl = blob.url;
                console.log(`   ✅ Image uploaded: ${imageUrl}`);
            } else {
                console.log(`   ⚠️ Image not found: ${imagePath}`);
            }

            // 5. Build Product Object (Vizaro Schema)
            const widthMeters = inchToMeter(row['Product Width']);
            const lengthMeters = inchToMeter(row['Product Length']);
            const coverage = (widthMeters && lengthMeters) ? (widthMeters * lengthMeters).toFixed(2) : '0';

            const product = {
                id: pattern,
                name: row['Name'] || 'Untitled Wallpaper',
                description: row['Description'] || '',
                price: cleanPrice(row['MSRP']),
                category: row['Style'] || 'General',
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
                imageUrls: imageUrl ? [imageUrl] : [],
                inStock: true,
                rating: 0,
                reviews: 0,
                showInHome: true, // Visible in Home for demo
                brand: row['Brand'],
                origin: row['Country of Origin']
            };

            // 6. Save to KV (Individual Keys)
            console.log(`   💾 Saving to Database Keys...`);
            await kv.set(`product:${product.id}`, product);
            await kv.sadd('wallpapers:ids', product.id);

            success++;
            processed++;
            displayItems.push(`${product.id} - ${product.name}`);

            // ALWAYS add to the list for the new catalog
            importedProducts.push(product);

            // Add to list, replacing old if exists
            if (catalogMap.has(product.id)) {
                catalogMap.set(product.id, product);
            }
        }

        console.log(`✨ Import completed! Processed ${processed} items.`);
        console.log(`📝 Summary:`);
        console.log(displayItems.join('\n'));

        // 7. Update Catalog Index (The "All Products" list for frontend)
        // Previously we merged. User asked to "overwrite" sample data.
        // So we will overwrite with the products we just imported.
        // NOTE: If IMPORT_LIMIT is small, we get small catalog. If Infinity, we get full.

        console.log(`📚 Updating Main Catalog Index (Overwrite Mode)...`);
        await kv.set('wallpapers_catalog', importedProducts);

        console.log(`✅ Catalog updated with ${importedProducts.length} items.`);

    } catch (err) {
        console.error('❌ Import failed:', err);
    } finally {
        sftp.end();
    }
}

main();
