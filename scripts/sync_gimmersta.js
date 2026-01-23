require('dotenv').config();
const { put, list } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// --- CONFIG ---
const CONFIG = {
    EXCEL_FILE: 'GW Products 1010262.xlsx', // Nombre del archivo Excel en la raíz
    IMAGES_DIR: './imagenes gimmersta',     // Carpeta de imágenes relativa a la raíz
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

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

// --- UTILS ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanPrice(price) {
    if (!price) return 0;
    return parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;
}

// Escaneo recursivo de carpetas locales
async function scanLocalImagesRecursive(dirPath, fileList = []) {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const resPath = path.resolve(dirPath, file.name);
            if (file.isDirectory()) {
                await scanLocalImagesRecursive(resPath, fileList);
            } else if (file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
                fileList.push({
                    name: file.name,
                    path: resPath,
                    size: 0 // Podríamos leer stats si fuera necesario
                });
            }
        }
    } catch (e) {
        console.warn(`    ⚠️ Error scanning local directory ${dirPath}: ${e.message}`);
    }
    return fileList;
}

// --- WATERMARK SYSTEM ---
let watermarkBuffer = null;

async function loadWatermark() {
    try {
        watermarkBuffer = await fs.readFile(CONFIG.WATERMARK.logoPath);
        console.log(`✅ Watermark logo loaded: ${CONFIG.WATERMARK.logoPath}`);
        return true;
    } catch (e) {
        console.warn(`⚠️ Could not load watermark: ${e.message}`);
        console.warn(`   Images will be uploaded without watermark`);
        return false;
    }
}

async function addWatermark(imageBuffer) {
    if (!CONFIG.WATERMARK.enabled || !watermarkBuffer) return imageBuffer;
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
        const left = Math.floor((metadata.width - watermarkMetadata.width) / 2);
        const top = Math.floor((metadata.height - watermarkMetadata.height) / 2);

        return await image
            .composite([{ input: watermarkWithOpacity, left, top, blend: 'over' }])
            .jpeg({ quality: 90 })
            .toBuffer();
    } catch (e) {
        return imageBuffer;
    }
}

async function uploadImageWithRetry(localPath, remotePath) {
    // 0. Verificar existencia
    try {
        const { blobs } = await list({
            prefix: remotePath,
            limit: 1,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        if (blobs.length > 0) {
            console.log(`      ✅ Image exists (Skipping): ${blobs[0].url}`);
            return blobs[0].url;
        }
    } catch (e) {
        console.warn(`      ⚠️ Warning checking blob existence: ${e.message}`);
    }

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`      📥 Reading & Processing...`);
            const buffer = await fs.readFile(localPath);
            const processedBuffer = await addWatermark(buffer);
            console.log(`      📤 Uploading to Vercel Pool...`);
            const blob = await put(remotePath, processedBuffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                addRandomSuffix: false
            });
            return blob.url;
        } catch (e) {
            if (e.message.includes('already exists')) {
                try {
                    const { blobs } = await list({ prefix: remotePath, limit: 1, token: process.env.BLOB_READ_WRITE_TOKEN });
                    if (blobs.length > 0) return blobs[0].url;
                } catch (ex) { }
                return null;
            }

            if (attempt < CONFIG.MAX_RETRIES) {
                await sleep(1000 * attempt);
            } else {
                console.error(`      💀 Upload failed: ${e.message}`);
                return null;
            }
        }
    }
}

async function main() {
    console.log(`🚀 GIMMERSTA SYNC TOOL (Excel + Local Images)`);
    console.log(`📅 ${new Date().toLocaleString()}\n`);

    await loadWatermark();

    // 1. Indexar imágenes locales
    console.log(`📂 Indexing local images in: ${CONFIG.IMAGES_DIR}`);
    const allImages = await scanLocalImagesRecursive(CONFIG.IMAGES_DIR);
    console.log(`✅ Found ${allImages.length} images.`);

    if (allImages.length === 0) {
        console.error('❌ No images found! Check path.');
        return;
    }

    // 2. Leer Excel
    console.log(`📊 Reading Excel: ${CONFIG.EXCEL_FILE}`);
    let rawData = [];
    try {
        const workbook = XLSX.readFile(CONFIG.EXCEL_FILE);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rawData = XLSX.utils.sheet_to_json(sheet);
        console.log(`✅ Loaded ${rawData.length} rows.`);
    } catch (e) {
        console.error(`❌ Error reading Excel: ${e.message}`);
        return;
    }

    // 3. Agrupar por Colección
    const collections = {};
    rawData.forEach(row => {
        const colName = row['Collection Name'] || 'Gimmersta Misc';
        if (!collections[colName]) collections[colName] = [];

        // Mapeo de columnas Gimmersta
        const product = {
            id: String(row['Pattern No']).trim(),
            name: row['Product Name'],
            price: cleanPrice(row['Retail Price']),
            collection: colName,
            sku: row['Pattern No'], // Usamos Pattern No como SKU también
            dimensions: `${row['Roll Width'] || ''} cm x ${row['Roll Length'] || ''} m`.trim(),
            repeat: row['Vertical Repeat'] ? `${row['Vertical Repeat']} cm` : null,
            brand: 'Gimmersta',
            hasImage: false,
            images: [],
            imageUrl: null
        };

        // Filtrar filas vacías o inválidas
        if (product.id && product.price > 0) {
            collections[colName].push(product);
        }
    });

    console.log(`📦 Found ${Object.keys(collections).length} collections.`);

    // 4. Procesar Colecciones
    const collectionNames = Object.keys(collections);
    let totalProcessed = 0;

    for (const colName of collectionNames) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎨 Processing Collection: ${colName}`);
        console.log(`${'='.repeat(60)}`);

        const products = collections[colName];
        const processedProducts = [];

        // Verificar si ya existe en KV (Opcional: saltar si ya está completo)
        // Por ahora sobrescribimos/actualizamos para asegurar integridad

        for (const product of products) {
            console.log(`   Processing: ${product.id} - ${product.name}`);

            // Buscar imágenes que coincidan
            // Lógica: nombre de archivo contiene ID
            const cleanId = product.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            const matches = allImages.filter(img => {
                const cleanName = img.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return img.name.toLowerCase().includes(product.id.toLowerCase()) || cleanName.includes(cleanId);
            }).slice(0, 3); // Max 3 imágenes

            if (matches.length > 0) {
                console.log(`      📸 Found ${matches.length} matches.`);
                for (let i = 0; i < matches.length; i++) {
                    const match = matches[i];
                    // Subir archivo local -> Vercel Blob
                    const url = await uploadImageWithRetry(match.path, `wallpapers/gimmersta/${colName}/${match.name}`);

                    if (url) {
                        product.images.push(url);
                    }
                }
                if (product.images.length > 0) {
                    product.imageUrl = product.images[0];
                    product.hasImage = true;
                }
            } else {
                console.log(`      ⚠️ No images found locally.`);
            }

            processedProducts.push(product);
            await sleep(100); // Pequeña pausa
        }

        // 5. Guardar en KV
        if (processedProducts.length > 0) {
            // A. Guardar productos de la colección
            await kv.set(`collection:${colName}`, processedProducts);

            // B. Actualizar Hash Global
            let hashUpdates = {};
            for (const p of processedProducts) {
                if (p.hasImage) hashUpdates[p.id] = JSON.stringify(p);
            }
            if (Object.keys(hashUpdates).length > 0) {
                const CHUNK_SIZE = 1000;
                const entries = Object.entries(hashUpdates);
                for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
                    const chunk = Object.fromEntries(entries.slice(i, i + CHUNK_SIZE));
                    await kv.hset('wallpapers_catalog_hash', chunk);
                }
                console.log(`      🔗 Updated Global Hash.`);
            }

            // C. Actualizar Índice de Series
            const seriesIndex = await kv.get('wallpapers_series_index') || [];
            const firstWithImage = processedProducts.find(p => p.hasImage && p.imageUrl);

            const metaEntry = {
                id: colName,
                name: colName,
                count: processedProducts.length,
                thumbnail: firstWithImage ? firstWithImage.imageUrl : null,
                provider: 'Gimmersta'
            };

            const existingIdx = seriesIndex.findIndex(i => (typeof i === 'string' ? i : i.id) === colName);
            if (existingIdx >= 0) seriesIndex[existingIdx] = metaEntry;
            else seriesIndex.push(metaEntry);

            await kv.set('wallpapers_series_index', seriesIndex);
            console.log(`      📚 Updated Series Index.`);
        }
    }

    console.log(`\n🎉 Gimmersta Sync Complete!`);
}

main();
