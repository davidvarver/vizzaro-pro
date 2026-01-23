require('dotenv').config();
const { put, list } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// --- CONFIG ---
const CONFIG = {
    EXCEL_FILE: './GW Products 1010262.xlsx',
    IMAGES_DIR: './imagenes gimmersta',
    CHECKPOINT_FILE: './sync_gimmersta_progress.json',
    SAVE_CHECKPOINT_EVERY: 5,
    MAX_RETRIES: 3,
    UPLOAD_DELAY: 500,
    WATERMARK: {
        enabled: true,
        logoPath: process.env.WATERMARK_LOGO_PATH || './assets/images/logo-header.png',
        position: 'center',
        opacity: 0.4,
        scale: 0.3,
        margin: 20
    }
};

const args = process.argv.slice(2);
const FORCE_UPDATE = args.includes('--force');
const RESET_PROGRESS = args.includes('--reset');
const SKIP_WATERMARK = args.includes('--no-watermark');
const TARGET_COLLECTION = args.find(arg => !arg.startsWith('--')) || null;

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

// --- CHECKPOINT SYSTEM ---
let checkpoint = {
    lastCollection: null,
    lastProductIndex: 0,
    completedCollections: [],
    timestamp: null
};

async function loadCheckpoint() {
    try {
        const data = await fs.readFile(CONFIG.CHECKPOINT_FILE, 'utf8');
        checkpoint = JSON.parse(data);
        console.log(`\n📌 Checkpoint loaded:`);
        console.log(`   Last collection: ${checkpoint.lastCollection || 'none'}`);
        console.log(`   Last product index: ${checkpoint.lastProductIndex}`);
        console.log(`   Completed collections: ${checkpoint.completedCollections.length}`);
        return true;
    } catch (e) {
        console.log(`ℹ️ No checkpoint found, starting fresh`);
        return false;
    }
}

async function saveCheckpoint() {
    checkpoint.timestamp = Date.now();
    try {
        await fs.writeFile(CONFIG.CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
    } catch (e) {
        console.error(`⚠️ Failed to save checkpoint: ${e.message}`);
    }
}

async function clearCheckpoint() {
    try {
        await fs.unlink(CONFIG.CHECKPOINT_FILE);
        console.log('✅ Checkpoint cleared');
    } catch (e) { }
}

// --- UTILS ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanPrice(price) {
    if (!price) return 0;
    return parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;
}

function cleanDimensions(dimStr) {
    if (!dimStr) return null;
    return String(dimStr).trim();
}

function cleanRepeat(repeatStr) {
    if (!repeatStr) return null;
    return String(repeatStr).trim();
}

// Escaneo recursivo de imágenes locales
async function scanLocalImagesRecursive(dirPath, fileList = []) {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const resPath = path.resolve(dirPath, file.name);
            if (file.isDirectory()) {
                await scanLocalImagesRecursive(resPath, fileList);
            } else if (file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
                const stats = await fs.stat(resPath);
                fileList.push({
                    name: file.name,
                    path: resPath,
                    size: stats.size
                });
            }
        }
    } catch (e) {
        console.warn(`⚠️ Error scanning ${dirPath}: ${e.message}`);
    }
    return fileList;
}

// --- WATERMARK SYSTEM ---
let watermarkBuffer = null;

async function loadWatermark() {
    if (!CONFIG.WATERMARK.enabled || SKIP_WATERMARK) {
        console.log('ℹ️ Watermark disabled');
        return false;
    }

    try {
        watermarkBuffer = await fs.readFile(CONFIG.WATERMARK.logoPath);
        console.log(`✅ Watermark logo loaded`);
        return true;
    } catch (e) {
        console.warn(`⚠️ Could not load watermark: ${e.message}`);
        CONFIG.WATERMARK.enabled = false;
        return false;
    }
}

async function addWatermark(imageBuffer) {
    if (!CONFIG.WATERMARK.enabled || !watermarkBuffer) {
        return imageBuffer;
    }

    try {
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        const watermarkWidth = Math.floor(metadata.width * CONFIG.WATERMARK.scale);

        const resizedWatermark = await sharp(watermarkBuffer)
            .resize(watermarkWidth, null, { fit: 'inside' })
            .png()
            .toBuffer();

        const watermarkWithOpacity = await sharp(resizedWatermark)
            .composite([{
                input: Buffer.from([255, 255, 255, Math.floor(255 * (1 - CONFIG.WATERMARK.opacity))]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'dest-in'
            }])
            .toBuffer();

        const watermarkMetadata = await sharp(watermarkWithOpacity).metadata();
        let left, top;
        const margin = CONFIG.WATERMARK.margin;

        switch (CONFIG.WATERMARK.position) {
            case 'center':
                left = Math.floor((metadata.width - watermarkMetadata.width) / 2);
                top = Math.floor((metadata.height - watermarkMetadata.height) / 2);
                break;
            case 'bottom-right':
                left = metadata.width - watermarkMetadata.width - margin;
                top = metadata.height - watermarkMetadata.height - margin;
                break;
            default:
                left = Math.floor((metadata.width - watermarkMetadata.width) / 2);
                top = Math.floor((metadata.height - watermarkMetadata.height) / 2);
        }

        const watermarkedBuffer = await image
            .composite([{
                input: watermarkWithOpacity,
                left: left,
                top: top,
                blend: 'over'
            }])
            .jpeg({ quality: 90 })
            .toBuffer();

        return watermarkedBuffer;
    } catch (e) {
        console.warn(`   ⚠️ Watermark failed: ${e.message}`);
        return imageBuffer;
    }
}

async function uploadImageWithRetry(localPath, remotePath, retries = CONFIG.MAX_RETRIES) {
    // Verificar si ya existe
    try {
        const { blobs } = await list({
            prefix: remotePath,
            limit: 1,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        if (blobs.length > 0) {
            console.log(`      ✅ Already exists: ${blobs[0].url}`);
            return blobs[0].url;
        }
    } catch (e) { }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`      📥 Reading local file...`);
            const buffer = await fs.readFile(localPath);

            console.log(`      🎨 Processing watermark...`);
            const processedBuffer = await addWatermark(buffer);

            console.log(`      📤 Uploading to Vercel Blob...`);
            const blob = await put(remotePath, processedBuffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                addRandomSuffix: false
            });

            return blob.url;
        } catch (e) {
            if (attempt < retries) {
                const delay = attempt * 2000;
                console.log(`      ⏳ Retry ${attempt}/${retries} in ${delay}ms...`);
                await sleep(delay);
            } else {
                console.error(`      💀 Upload failed: ${e.message}`);
                return null;
            }
        }
    }
}

async function processProducts(products, allImages, collectionName, startIndex = 0) {
    const results = [];

    if (startIndex > 0) {
        console.log(`\n🔄 Resuming from product ${startIndex}`);
        const existingData = await kv.get(`collection:${collectionName}`);
        if (existingData && Array.isArray(existingData)) {
            results.push(...existingData.slice(0, startIndex));
        }
    }

    for (let i = startIndex; i < products.length; i++) {
        const product = products[i];

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`[${i + 1}/${products.length}] ${product.id} - ${product.name}`);
        console.log(`   💰 Price: $${product.price}`);
        console.log(`   📏 Dimensions: ${product.dimensions || 'N/A'}`);
        console.log(`   🔄 Repeat: ${product.repeat || 'N/A'}`);

        // Buscar TODAS las imágenes que coincidan con SKU (Match exacto o con separadores)
        const matches = allImages.filter(img => {
            const imgName = img.name.toLowerCase();
            // Escapar caracteres especiales de regex en el ID por si acaso
            const pattern = product.id.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Regex: 
            // - Inicio de string O caracter no alfanulérico (separator)
            // - ID del producto
            // - Fin de string O caracter no alfanumérico
            // Esto evita que "101" coincida con "S10176"
            const regex = new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, 'i');

            return regex.test(imgName);
        });

        if (matches.length > 0) {
            console.log(`   🖼️ Found ${matches.length} image(s)`);
            const imageUrls = [];

            for (const match of matches) {
                console.log(`      Processing: ${match.name} (${(match.size / 1024).toFixed(2)} KB)`);
                const url = await uploadImageWithRetry(
                    match.path,
                    `wallpapers/gimmersta/${collectionName}/${match.name}`
                );

                if (url) imageUrls.push(url);
                await sleep(CONFIG.UPLOAD_DELAY);
            }

            product.images = imageUrls;
            product.imageUrl = imageUrls[0] || null; // Primary image
            product.hasImage = imageUrls.length > 0;
            console.log(`   ✅ Uploaded ${imageUrls.length}/${matches.length} images`);
        } else {
            console.log(`   ⚠️ No images found for pattern ${product.id}`);
            product.images = [];
            product.imageUrl = null;
            product.hasImage = false;
        }

        results.push(product);

        // Checkpoint
        if ((i + 1) % CONFIG.SAVE_CHECKPOINT_EVERY === 0) {
            checkpoint.lastCollection = collectionName;
            checkpoint.lastProductIndex = i + 1;
            await saveCheckpoint();
            await kv.set(`collection:${collectionName}`, results);
            console.log(`   💾 Checkpoint saved (${i + 1}/${products.length})`);
        }
    }

    return results;
}

async function processCollection(collectionName, products) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎨 Collection: ${collectionName}`);
    console.log(`${'='.repeat(60)}`);

    if (checkpoint.completedCollections.includes(collectionName)) {
        console.log(`✅ Already completed, skipping...`);
        return { skipped: true };
    }

    const resumeIndex = (checkpoint.lastCollection === collectionName)
        ? checkpoint.lastProductIndex
        : 0;

    if (resumeIndex === 0) {
        const existingData = await kv.get(`collection:${collectionName}`);
        if (existingData && !FORCE_UPDATE) {
            console.log(`⚠️ Already exists in database (${existingData.length} products)`);
            console.log(`ℹ️ Use --force to overwrite`);
            checkpoint.completedCollections.push(collectionName);
            await saveCheckpoint();
            return { skipped: true };
        }
    }

    // Indexar imágenes
    console.log(`📂 Indexing images from: ${CONFIG.IMAGES_DIR}`);
    const allImages = await scanLocalImagesRecursive(CONFIG.IMAGES_DIR);
    console.log(`✅ Found ${allImages.length} local images`);

    // Procesar productos
    const processedProducts = await processProducts(products, allImages, collectionName, resumeIndex);

    // Estadísticas
    const withImages = processedProducts.filter(p => p.hasImage).length;
    const totalImagesUploaded = processedProducts.reduce((sum, p) => sum + (p.images?.length || 0), 0);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Statistics:`);
    console.log(`   Total Products: ${processedProducts.length}`);
    console.log(`   With Images: ${withImages}`);
    console.log(`   Total Images Uploaded: ${totalImagesUploaded}`);
    console.log(`${'='.repeat(60)}`);

    // Guardar en KV
    if (processedProducts.length > 0) {
        await kv.set(`collection:${collectionName}`, processedProducts);

        // Actualizar hash global
        let hashUpdates = {};
        for (const p of processedProducts) {
            if (p.hasImage) {
                hashUpdates[p.id] = JSON.stringify(p);
            }
        }

        if (Object.keys(hashUpdates).length > 0) {
            const CHUNK_SIZE = 1000;
            const entries = Object.entries(hashUpdates);
            for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
                const chunk = Object.fromEntries(entries.slice(i, i + CHUNK_SIZE));
                await kv.hset('wallpapers_catalog_hash', chunk);
            }
            console.log(`🔗 Updated catalog hash (${Object.keys(hashUpdates).length} items)`);
        }

        // Actualizar índice de series
        const seriesIndex = await kv.get('wallpapers_series_index') || [];
        const firstWithImage = processedProducts.find(p => p.hasImage && p.imageUrl);

        const metaEntry = {
            id: collectionName,
            name: collectionName,
            count: processedProducts.length,
            thumbnail: firstWithImage ? firstWithImage.imageUrl : null,
            provider: 'Gimmersta'
        };

        const existingIdx = seriesIndex.findIndex(i =>
            (typeof i === 'string' ? i : i.id) === collectionName
        );

        if (existingIdx >= 0) {
            seriesIndex[existingIdx] = metaEntry;
        } else {
            seriesIndex.push(metaEntry);
        }

        await kv.set('wallpapers_series_index', seriesIndex);
        console.log(`📚 Updated series index`);
    }

    checkpoint.completedCollections.push(collectionName);
    checkpoint.lastCollection = null;
    checkpoint.lastProductIndex = 0;
    await saveCheckpoint();

    return { success: true, total: processedProducts.length, withImages };
}

async function main() {
    console.log(`🚀 GIMMERSTA SYNC TOOL v1.0`);
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    await loadWatermark();

    if (RESET_PROGRESS) {
        await clearCheckpoint();
        console.log('🔄 Progress reset\n');
    } else {
        await loadCheckpoint();
    }

    try {
        // Leer Excel
        console.log(`📊 Reading Excel: ${CONFIG.EXCEL_FILE}`);
        const workbook = XLSX.readFile(CONFIG.EXCEL_FILE);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);
        console.log(`✅ Found ${rawData.length} rows in Excel`);

        // Agrupar por Collection Name
        const collectionMap = {};
        for (const row of rawData) {
            if (!row['Pattern No'] || !row['Collection Name']) continue;

            const collectionName = String(row['Collection Name']).trim();
            if (!collectionMap[collectionName]) {
                collectionMap[collectionName] = [];
            }

            collectionMap[collectionName].push({
                id: String(row['Pattern No']).trim(),
                name: row['Product Name'] || row['Name'] || `${collectionName} - ${row['Pattern No']}`,
                price: cleanPrice(row['Retail Price'] || row['MSRP'] || row['Price']),
                collection: collectionName,
                sku: row['Product No'] || row['Pattern No'],
                dimensions: (row['Roll Width'] && row['Roll Length'])
                    ? `${row['Roll Width']}cm x ${row['Roll Length']}m`
                    : cleanDimensions(row['Dimensions'] || row['Size']),
                repeat: cleanRepeat(row['Vertical Repeat'] || row['Repeat']),
                material: row['Material'] || row['Type'] || null,
                hasImage: false,
                images: []
            });
        }

        const collections = Object.entries(collectionMap);
        console.log(`✅ Grouped into ${collections.length} collections\n`);

        const summary = { total: collections.length, success: 0, skipped: 0, errors: 0 };

        // Procesar colecciones
        for (const [collectionName, products] of collections) {
            if (TARGET_COLLECTION && collectionName !== TARGET_COLLECTION) continue;

            const result = await processCollection(collectionName, products);

            if (result.success) summary.success++;
            else if (result.skipped) summary.skipped++;
            else summary.errors++;

            await sleep(1000);
        }

        if (summary.success + summary.skipped === summary.total) {
            console.log(`\n🎉 All collections processed! Clearing checkpoint...`);
            await clearCheckpoint();
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 FINAL SUMMARY`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Total Collections: ${summary.total}`);
        console.log(`✅ Successful: ${summary.success}`);
        console.log(`⏭️ Skipped: ${summary.skipped}`);
        console.log(`❌ Errors: ${summary.errors}`);
        console.log(`\n✨ Sync Complete!`);

    } catch (e) {
        console.error('💀 FATAL ERROR:', e.message);
        console.error(e.stack);
    }
}

process.on('SIGINT', async () => {
    console.log('\n\n⚠️ Interrupted (Ctrl+C)');
    console.log('💾 Saving progress...');
    await saveCheckpoint();
    console.log('✅ Progress saved!');
    process.exit(0);
});

main();
