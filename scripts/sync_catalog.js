require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// --- CONFIG ---
const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
    readyTimeout: 30000,
    keepalive: 10000,
    retries: 3,
    retry_minTimeout: 2000
};

// Configuración de límites
const CONFIG = {
    MAX_CONCURRENT_UPLOADS: 3,
    UPLOAD_DELAY: 500,
    MAX_RETRIES: 3,
    BATCH_SIZE: 10,
    CHECKPOINT_FILE: './sync_progress.json',
    SAVE_CHECKPOINT_EVERY: 5,
    WATERMARK: {
        enabled: true,
        logoPath: process.env.WATERMARK_LOGO_PATH || './assets/images/logo-header.png',
        position: 'center', // 'bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'
        opacity: 0.4, // Increased slightly for visibility
        scale: 0.3, // Increased size slightly
        margin: 20 // Margen desde el borde en píxeles (no aplica en center)
    }
};

// Initialize Clients
const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const args = process.argv.slice(2);
const FORCE_UPDATE = args.includes('--force');
const RESET_PROGRESS = args.includes('--reset');
const SKIP_WATERMARK = args.includes('--no-watermark');
const TARGET_NAME = args.find(arg => !arg.startsWith('--')) || null;

// --- CHECKPOINT SYSTEM ---
let checkpoint = {
    lastCollection: null,
    lastProductIndex: 0,
    completedCollections: [],
    timestamp: null,
    totalProcessed: 0
};

async function loadCheckpoint() {
    try {
        const data = await fs.readFile(CONFIG.CHECKPOINT_FILE, 'utf8');
        checkpoint = JSON.parse(data);
        console.log(`\n📌 Checkpoint loaded:`);
        console.log(`   Last collection: ${checkpoint.lastCollection || 'none'}`);
        console.log(`   Last product index: ${checkpoint.lastProductIndex}`);
        console.log(`   Completed collections: ${checkpoint.completedCollections.length}`);
        console.log(`   Total processed: ${checkpoint.totalProcessed}`);
        console.log(`   Timestamp: ${new Date(checkpoint.timestamp).toLocaleString()}`);
        return true;
    } catch (e) {
        console.log(`ℹ️ No previous checkpoint found, starting fresh`);
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
    } catch (e) {
        // File doesn't exist, that's ok
    }
}

function shouldSkipCollection(collectionName) {
    return checkpoint.completedCollections.includes(collectionName);
}

function shouldResumeCollection(collectionName) {
    return checkpoint.lastCollection === collectionName && checkpoint.lastProductIndex > 0;
}

// --- UTILS ---
function cleanPrice(priceStr) {
    if (!priceStr) return 0;
    return parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
}

function cleanDimensions(dimStr) {
    if (!dimStr) return null;
    // Normalizar formato: "20.5 x 33" o "20.5" x 33'" etc
    return String(dimStr).trim();
}

function cleanRepeat(repeatStr) {
    if (!repeatStr) return null;
    // Normalizar formato de repetición
    return String(repeatStr).trim();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// --- WATERMARK SYSTEM ---
let watermarkBuffer = null;

async function loadWatermark() {
    if (!CONFIG.WATERMARK.enabled || SKIP_WATERMARK) {
        console.log('ℹ️ Watermark disabled');
        return false;
    }

    try {
        watermarkBuffer = await fs.readFile(CONFIG.WATERMARK.logoPath);
        console.log(`✅ Watermark logo loaded: ${CONFIG.WATERMARK.logoPath}`);
        return true;
    } catch (e) {
        console.warn(`⚠️ Could not load watermark: ${e.message}`);
        console.warn(`   Images will be uploaded without watermark`);
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

        // Calcular tamaño del watermark
        const watermarkWidth = Math.floor(metadata.width * CONFIG.WATERMARK.scale);

        // Redimensionar y aplicar opacidad al watermark
        const resizedWatermark = await sharp(watermarkBuffer)
            .resize(watermarkWidth, null, { fit: 'inside' })
            .png() // Asegurar que sea PNG para transparencia
            .toBuffer();

        // Crear overlay con opacidad
        const watermarkWithOpacity = await sharp(resizedWatermark)
            .composite([{
                input: Buffer.from([255, 255, 255, Math.floor(255 * (1 - CONFIG.WATERMARK.opacity))]),
                raw: { width: 1, height: 1, channels: 4 },
                tile: true,
                blend: 'dest-in'
            }])
            .toBuffer();

        const watermarkMetadata = await sharp(watermarkWithOpacity).metadata();

        // Calcular posición
        let left, top;
        const margin = CONFIG.WATERMARK.margin;

        switch (CONFIG.WATERMARK.position) {
            case 'bottom-right':
                left = metadata.width - watermarkMetadata.width - margin;
                top = metadata.height - watermarkMetadata.height - margin;
                break;
            case 'bottom-left':
                left = margin;
                top = metadata.height - watermarkMetadata.height - margin;
                break;
            case 'top-right':
                left = metadata.width - watermarkMetadata.width - margin;
                top = margin;
                break;
            case 'top-left':
                left = margin;
                top = margin;
                break;
            case 'center':
                left = Math.floor((metadata.width - watermarkMetadata.width) / 2);
                top = Math.floor((metadata.height - watermarkMetadata.height) / 2);
                break;
            default:
                left = metadata.width - watermarkMetadata.width - margin;
                top = metadata.height - watermarkMetadata.height - margin;
        }

        // Aplicar watermark y mantener calidad de imagen original
        const watermarkedBuffer = await image
            .composite([{
                input: watermarkWithOpacity,
                left: left,
                top: top,
                blend: 'over' // Blend mode para mejor integración
            }])
            .jpeg({ quality: 90 }) // Alta calidad para producto
            .toBuffer();

        console.log(`   ✨ Watermark applied (${CONFIG.WATERMARK.position}, ${CONFIG.WATERMARK.opacity * 100}% opacity)`);

        return watermarkedBuffer;

    } catch (e) {
        console.warn(`   ⚠️ Watermark failed: ${e.message}, uploading original`);
        return imageBuffer;
    }
}

async function uploadImageWithRetry(imagePath, remotePath, retries = CONFIG.MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // 1. Descargar imagen del FTP
            console.log(`   📥 Downloading from FTP...`);
            const buffer = await sftp.get(imagePath);

            // 2. Aplicar marca de agua
            console.log(`   🎨 Processing image...`);
            const processedBuffer = await addWatermark(buffer);

            // 3. Subir a Vercel Blob
            console.log(`   📤 Uploading to Vercel Blob...`);
            const blob = await put(remotePath, processedBuffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                addRandomSuffix: false,
                allowOverwrite: true
            });

            return blob.url;
        } catch (e) {
            if (attempt < retries) {
                const delay = attempt * 2000;
                console.log(`   ⏳ Retry ${attempt}/${retries} in ${delay}ms...`);
                await sleep(delay);
            } else {
                console.error(`   💀 Upload failed after ${retries} attempts: ${e.message}`);
                return null;
            }
        }
    }
}

// Procesar productos con sistema de checkpoint
async function processProductBatch(products, allImages, collectionName, startIndex = 0) {
    const results = [];

    // Si estamos resumiendo, cargar productos ya procesados desde KV
    if (startIndex > 0) {
        console.log(`\n🔄 Resuming from product index ${startIndex}`);
        const existingData = await kv.get(`collection:${collectionName}`);
        if (existingData && Array.isArray(existingData)) {
            results.push(...existingData.slice(0, startIndex));
            console.log(`   Loaded ${startIndex} previously processed products`);
        }
    }

    for (let i = startIndex; i < products.length; i++) {
        const product = products[i];

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`[${i + 1}/${products.length}] Processing: ${product.id} - ${product.name}`);
        console.log(`   💰 Price: $${product.price}`);
        console.log(`   📏 Dimensions: ${product.dimensions || 'N/A'}`);
        console.log(`   🔄 Repeat: ${product.repeat || 'N/A'}`);

        const match = allImages.find(img =>
            img.name.toLowerCase().includes(product.id.toLowerCase()) ||
            img.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(product.id.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );

        if (match) {
            console.log(`   🖼️ Found image: ${match.name} (${(match.size / 1024).toFixed(2)} KB)`);
            const imageUrl = await uploadImageWithRetry(
                match.path,
                `wallpapers/${collectionName}/${match.name}`
            );

            if (imageUrl) {
                product.imageUrl = imageUrl;
                product.hasImage = true;
                console.log(`   ✅ Upload successful: ${imageUrl}`);
            } else {
                product.hasImage = false;
                console.log(`   ❌ Upload failed`);
            }
        } else {
            console.log(`   ⚠️ No image found for pattern ${product.id}`);
            product.hasImage = false;
        }

        results.push(product);

        // Guardar checkpoint cada N productos
        if ((i + 1) % CONFIG.SAVE_CHECKPOINT_EVERY === 0) {
            checkpoint.lastCollection = collectionName;
            checkpoint.lastProductIndex = i + 1;
            checkpoint.totalProcessed = results.length;
            await saveCheckpoint();

            // Guardar progreso parcial en KV también
            await kv.set(`collection:${collectionName}`, results);
            console.log(`   💾 Checkpoint saved (${i + 1}/${products.length})`);
        }

        // Delay entre productos
        await sleep(CONFIG.UPLOAD_DELAY);
    }

    return results;
}

async function processCollection(collectionName, rootPath) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎨 Processing Collection: ${collectionName}`);
    console.log(`${'='.repeat(60)}`);

    // Verificar si ya fue completada
    if (shouldSkipCollection(collectionName)) {
        console.log(`✅ Collection already completed, skipping...`);
        return { skipped: true, collection: collectionName, reason: 'Already completed' };
    }

    try {
        // Determinar si debemos resumir
        const resumeIndex = shouldResumeCollection(collectionName) ? checkpoint.lastProductIndex : 0;

        if (resumeIndex > 0) {
            console.log(`🔄 Resuming collection from product ${resumeIndex}`);
        }

        // Verificar data existente (solo si no estamos resumiendo)
        if (resumeIndex === 0) {
            const existingData = await kv.get(`collection:${collectionName}`);

            if (existingData && !FORCE_UPDATE) {
                console.log(`⚠️ Collection already exists in database with ${existingData.length} products`);
                console.log(`ℹ️ Use --force flag to overwrite existing data`);

                // Marcar como completada
                checkpoint.completedCollections.push(collectionName);
                await saveCheckpoint();

                return { skipped: true, collection: collectionName, reason: 'Already in database' };
            }
        }

        // Buscar archivo Excel
        const rootItems = await sftp.list(rootPath);
        const excelFile = rootItems.find(f => f.name.match(/\.xlsx?$/i));
        let products = [];

        if (excelFile) {
            console.log(`📊 Found Excel: ${excelFile.name}`);

            try {
                const buffer = await sftp.get(`${rootPath}/${excelFile.name}`);
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json(sheet);

                // Mapeo flexible de columnas (busca variaciones comunes)
                products = rawData
                    .filter(r => r.Pattern && String(r.Pattern).trim())
                    .map(r => ({
                        id: String(r.Pattern).trim(),
                        name: r.Name || r.Description || r['Product Name'] || `${collectionName} - ${r.Pattern}`,
                        price: cleanPrice(r.MSRP || r.Price || r['List Price'] || r['Retail Price']),
                        collection: collectionName,
                        sku: r.SKU || r.Pattern,
                        dimensions: cleanDimensions(
                            r.Dimensions || r.Size || r.Dimension || r['Roll Size'] ||
                            ((r.Width || r['Roll Width'] || r['Width (in)']) && (r.Length || r['Roll Length'] || r['Length (ft)']) ?
                                `${r.Width || r['Roll Width'] || r['Width (in)']} ${r['Width (in)'] ? 'in' : ''} x ${r.Length || r['Roll Length'] || r['Length (ft)']} ${r['Length (ft)'] ? 'ft' : ''}` : null)
                        ),
                        repeat: cleanRepeat(
                            r.Repeat || r['Pattern Repeat'] || r['Vertical Repeat'] || r['Repeat (in)'] ||
                            r['Match'] || r['Repeat Pattern'] || null
                        ),
                        material: r.Material || r.Type || r.Substrate || null,
                        hasImage: false
                    }));

                console.log(`✅ Parsed ${products.length} products from Excel`);

                // Mostrar muestra de datos parseados
                if (products.length > 0) {
                    console.log(`\n📋 Sample product data:`);
                    const sample = products[0];
                    console.log(`   ID: ${sample.id}`);
                    console.log(`   Name: ${sample.name}`);
                    console.log(`   Price: $${sample.price}`);
                    console.log(`   Dimensions: ${sample.dimensions || 'N/A'}`);
                    console.log(`   Repeat: ${sample.repeat || 'N/A'}`);
                    console.log(`   Material: ${sample.material || 'N/A'}`);
                }
            } catch (e) {
                console.error(`❌ Error parsing Excel: ${e.message}`);
                return { error: true, message: 'Excel parsing failed' };
            }
        } else {
            console.log(`⚠️ No Excel file found - SKIPPING COLLECTION`);

            // Marcar como completada (aunque no se procesó)
            checkpoint.completedCollections.push(collectionName);
            await saveCheckpoint();

            return { skipped: true, reason: 'No metadata file' };
        }

        // Escanear imágenes
        console.log(`\n🔍 Scanning images...`);
        const allImages = await scanRecursive(rootPath);
        console.log(`✅ Found ${allImages.length} images`);

        // Procesar productos (con resume si aplica)
        console.log(`\n📤 Starting image processing & upload...`);
        const processedProducts = await processProductBatch(products, allImages, collectionName, resumeIndex);

        // Estadísticas
        const withImages = processedProducts.filter(p => p.hasImage).length;
        const withoutImages = processedProducts.filter(p => !p.hasImage).length;
        const withPrice = processedProducts.filter(p => p.price > 0).length;
        const withDimensions = processedProducts.filter(p => p.dimensions).length;
        const withRepeat = processedProducts.filter(p => p.repeat).length;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 Collection Statistics:`);
        console.log(`${'='.repeat(60)}`);
        console.log(`   Total Products: ${processedProducts.length}`);
        console.log(`   ✅ With Images: ${withImages} (${((withImages / processedProducts.length) * 100).toFixed(1)}%)`);
        console.log(`   ❌ Missing Images: ${withoutImages}`);
        console.log(`   💰 With Price: ${withPrice}`);
        console.log(`   📏 With Dimensions: ${withDimensions}`);
        console.log(`   🔄 With Repeat: ${withRepeat}`);

        // Guardar en KV (versión final)
        if (processedProducts.length > 0) {
            await kv.set(`collection:${collectionName}`, processedProducts);

            // --- RESTORED INDEX UPDATE LOGIC ---
            // 1. Update Global Hash (for search/lookup)
            let hashUpdates = {};
            for (const p of processedProducts) {
                if (p.hasImage && p.imageUrl) {
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
                console.log(`   🔗 Updated Main Catalog Hash (${Object.keys(hashUpdates).length} items)`);
            }

            // 2. Update Series Index (Home Page)
            const seriesIndex = await kv.get('wallpapers_series_index') || [];
            if (!seriesIndex.includes(collectionName)) {
                seriesIndex.push(collectionName);
                await kv.set('wallpapers_series_index', seriesIndex);
                console.log(`   📚 Added to Series Index: ${collectionName}`);
            }
            // -----------------------------------

            console.log(`✅ Saved to database: collection:${collectionName}`);
        }

        // Marcar colección como completada
        if (!checkpoint.completedCollections.includes(collectionName)) {
            checkpoint.completedCollections.push(collectionName);
        }
        checkpoint.lastCollection = null;
        checkpoint.lastProductIndex = 0;
        await saveCheckpoint();

        return {
            success: true,
            collection: collectionName,
            total: processedProducts.length,
            withImages,
            withoutImages,
            withPrice,
            withDimensions,
            withRepeat
        };

    } catch (e) {
        console.error(`❌ Fatal error processing ${collectionName}:`, e.message);
        return { error: true, collection: collectionName, message: e.message };
    }
}

async function main() {
    console.log(`🚀 WALLPAPER SYNC TOOL v3.0 (Full Data + Watermark)`);
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    // Cargar marca de agua
    await loadWatermark();

    // Resetear progreso si se solicita
    if (RESET_PROGRESS) {
        await clearCheckpoint();
        console.log('🔄 Progress reset\n');
    } else {
        await loadCheckpoint();
    }

    const summary = {
        total: 0,
        success: 0,
        skipped: 0,
        errors: 0
    };

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('\n✅ SFTP Connected\n');

        if (TARGET_NAME) {
            // Procesar una colección específica
            let rootPath = `/WallpaperBooks/${TARGET_NAME}`;

            if (!await sftp.exists(rootPath)) {
                const books = await sftp.list('/WallpaperBooks');
                const match = books.find(b =>
                    b.type === 'd' &&
                    b.name.toLowerCase().includes(TARGET_NAME.toLowerCase())
                );

                if (match) {
                    rootPath = `/WallpaperBooks/${match.name}`;
                    console.log(`ℹ️ Found match: ${match.name}`);
                } else {
                    throw new Error(`Collection not found: ${TARGET_NAME}`);
                }
            }

            const result = await processCollection(TARGET_NAME, rootPath);
            summary.total = 1;
            if (result.success) summary.success++;
            else if (result.skipped) summary.skipped++;
            else if (result.error) summary.errors++;

        } else {
            // Procesar TODAS las colecciones
            console.log('📚 Processing ALL collections...\n');
            const books = await sftp.list('/WallpaperBooks');
            const collections = books.filter(b => b.type === 'd' && b.name !== '.' && b.name !== '..');

            summary.total = collections.length;

            for (const col of collections) {
                const result = await processCollection(col.name, `/WallpaperBooks/${col.name}`);

                if (result.success) summary.success++;
                else if (result.skipped) summary.skipped++;
                else if (result.error) summary.errors++;

                await sleep(1000);
            }
        }

        // Limpiar checkpoint al finalizar todo
        if (summary.success + summary.skipped === summary.total) {
            console.log(`\n🎉 All collections processed! Clearing checkpoint...`);
            await clearCheckpoint();
        }

    } catch (e) {
        console.error('💀 FATAL ERROR:', e.message);
        console.error(e.stack);
        console.log('\n💾 Progress saved. You can resume by running the script again.');
    } finally {
        sftp.end();
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 FINAL SUMMARY`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Total Collections: ${summary.total}`);
        console.log(`✅ Successful: ${summary.success}`);
        console.log(`⏭️ Skipped: ${summary.skipped}`);
        console.log(`❌ Errors: ${summary.errors}`);
        console.log(`\n✨ Sync Complete!`);
    }
}

// Manejar interrupción con Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n\n⚠️ Interrupted by user (Ctrl+C)');
    console.log('💾 Saving progress...');
    await saveCheckpoint();
    console.log('✅ Progress saved! You can resume by running the script again.');
    sftp.end();
    process.exit(0);
});

main();
