// scripts/import-ftp.js
// Usage: node scripts/import-ftp.js
// Requires .env with: BLOB_READ_WRITE_TOKEN, KV_REST_API_URL, KV_REST_API_TOKEN

require('dotenv').config();
const Client = require('ssh2-sftp-client');
const XLSX = require('xlsx');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');

// Initialize clients
const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

// Config
const IMPORT_LIMIT = 5; // Dry run limit
const EXCEL_PATH = '/New Products/All Data/All_NewProduct_Data.xlsx';
const IMAGE_BASE_PATH = '/New Products/All Images';

// Helpers
const inchToMeter = (inches) => (inches ? parseFloat((inches * 0.0254).toFixed(2)) : 0);
const cleanPrice = (price) => (price ? parseFloat(price) : 0);

async function runImport() {
    console.log('🚀 Starting Import Pipeline...');

    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Missing BLOB_READ_WRITE_TOKEN');
    if (!process.env.KV_REST_API_URL) throw new Error('Missing KV_REST_API_URL');

    try {
        // 1. Connect and Download Excel
        console.log(`📡 Connecting to FTP...`);
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        console.log(`📥 Downloading Master Data: ${EXCEL_PATH}...`);
        const buffer = await sftp.get(EXCEL_PATH);

        // 2. Parse Excel
        console.log('📊 Parsing Excel...');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawProducts = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${rawProducts.length} total rows in Excel.`);

        // 3. Process Items
        let processed = 0;
        let success = 0;
        let displayItems = [];
        let importedProducts = [];

        // Filter potentially (e.g. only Wallpapers?)
        // For now, let's just take the first few legitimate items

        for (const row of rawProducts) {
            if (processed >= IMPORT_LIMIT) break;

            // Basic validation
            const pattern = row['Pattern'];
            if (!pattern) continue;

            console.log(`\n🔄 Processing ${pattern} (${row['Name']})...`);

            // 4. Check Image
            const imagePath = `${IMAGE_BASE_PATH}/${pattern}.jpg`;
            const imageExists = await sftp.exists(imagePath);

            let imageUrl = null;
            if (imageExists) {
                console.log(`   📸 Found image: ${imagePath}. Uploading to Blob...`);
                // Stream upload
                const imgBuffer = await sftp.get(imagePath);
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
            importedProducts.push(product);
        }

        console.log(`\n🎉 Import Complete (Dry Run). Processed: ${processed}, Success: ${success}`);
        console.log('Sample Items:', displayItems);

        // 7. Update Monolithic Catalog (frontend compatibility)
        if (importedProducts.length > 0) {
            try {
                console.log('\n🔄 Syncing with frontend catalog (wallpapers_catalog)...');

                // Fetch current catalog
                let currentCatalog = [];
                try {
                    const current = await kv.get('wallpapers_catalog');
                    if (current && Array.isArray(current)) currentCatalog = current;
                } catch (e) {
                    console.log('   Warning: Could not fetch existing catalog, starting fresh or assuming empty.');
                }

                console.log(`   Current catalog size: ${currentCatalog.length}`);
                console.log(`   Merging ${importedProducts.length} new items...`);

                // OVERWRITE catalog to remove samples as requested
                // const catalogMap = new Map();
                // currentCatalog.forEach(item => catalogMap.set(item.id, item));

                // Add/Update new items
                // importedProducts.forEach(item => {
                //    catalogMap.set(item.id, item);
                // });

                // Just use the new items to clear old samples
                const newCatalog = importedProducts;
                console.log(`   New catalog size: ${newCatalog.length} (Overwrite Mode)`);

                // Save back to KV
                await kv.set('wallpapers_catalog', newCatalog);
                console.log('   ✅ wallpapers_catalog overwritten successfully.');

            } catch (catErr) {
                console.error('   ❌ Failed to update main catalog key:', catErr);
            }
        }

    } catch (err) {
        console.error('❌ Import Failed:', err);
    } finally {
        sftp.end();
    }
}

runImport();
