require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put, list } = require('@vercel/blob');

// ... (previous code)

async function uploadImageWithRetry(imagePath, remotePath) {
    // 0. Verificar si ya existe en Blob
    try {
        const { blobs } = await list({
            prefix: remotePath,
            limit: 1,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        if (blobs.length > 0) {
            console.log(`      ✅ Image already exists (Skipping): ${blobs[0].url}`);
            return blobs[0].url;
        }
    } catch (e) {
        console.warn(`      ⚠️ Warning checking blob existence: ${e.message}`);
    }

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`      📥 Downloading & Processing...`);
            const buffer = await sftp.get(imagePath);
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
                console.log(`      ⚠️ Blob exists error caught.`);
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
const { createClient } = require('@vercel/kv');
const fs = require('fs').promises;
const sharp = require('sharp');
const path = require('path');

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

const CONFIG = {
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

const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

// --- UTILS ---
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
        console.warn(`    ⚠️ Error scanning subdirectory ${dirPath}: ${e.message}`);
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

async function uploadImageWithRetry(imagePath, remotePath) {
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
        try {
            console.log(`      📥 Downloading & Processing...`);
            const buffer = await sftp.get(imagePath);
            const processedBuffer = await addWatermark(buffer);
            console.log(`      📤 Uploading to Vercel Pool...`);
            const blob = await put(remotePath, processedBuffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                addRandomSuffix: false
            });
            return blob.url;
        } catch (e) {
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
    console.log(`🚀 IMAGE ENRICHMENT TOOL (Upgrade to 3 images)`);
    await loadWatermark();

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('✅ SFTP Connected');

        // 1. Get List of All Collections
        console.log('🔍 Scanning Index...');
        const seriesIndex = await kv.get('wallpapers_series_index') || [];
        console.log(`📊 Found ${seriesIndex.length} collections in database.`);

        let totalEnriched = 0;

        for (const meta of seriesIndex) {
            const collectionName = meta.id;

            // 2. Comprobar si necesita enriquecimiento
            const products = await kv.get(`collection:${collectionName}`);

            if (!products || products.length === 0) continue;

            // Verificar si hay productos incompletos (con imagen pero < 3 imágenes)
            // Ojo: products sin imagen se ignoran porque el recovery script se encarga de ellos
            const needsEnrichment = products.some(p => p.hasImage && (!p.images || p.images.length < 3));

            if (!needsEnrichment) {
                // console.log(`✅ ${collectionName} is fully enriched.`);
                continue;
            }

            console.log(`\n==================================================`);
            console.log(`💎 Enriching Collection: ${collectionName}`);
            console.log(`==================================================`);

            // Find Root Path
            let rootPath = `/WallpaperBooks/${collectionName}`;
            if (!await sftp.exists(rootPath)) {
                const books = await sftp.list('/WallpaperBooks');
                const match = books.find(b => b.name.toLowerCase() === collectionName.toLowerCase());
                if (match) rootPath = `/WallpaperBooks/${match.name}`;
                else {
                    console.log(`    ⚠️ Root folder not found. Skipping.`);
                    continue;
                }
            }

            console.log(`    📂 Folder: ${rootPath}`);
            console.log(`    🕵️‍♀️ Fetching all images recursively...`);
            const allImages = await scanRecursive(rootPath);
            console.log(`    📸 Found ${allImages.length} images in tree.`);

            let updates = 0;

            for (const product of products) {
                // Procesar solo si tiene imagen (para asegurarnos que existe) y le faltan variantes
                // Si no tiene 'images' array, lo creamos
                if (!product.images) product.images = [];
                if (product.imageUrl && !product.images.includes(product.imageUrl)) {
                    product.images.unshift(product.imageUrl);
                }

                // Si ya tiene 3 o más, saltar
                if (product.images.length >= 3) continue;

                // Buscar matches
                const cleanId = product.id.toLowerCase().replace(/[^a-z0-9]/g, '');
                const matches = allImages.filter(img => {
                    const cleanName = img.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return img.name.toLowerCase().includes(product.id.toLowerCase()) || cleanName.includes(cleanId);
                }).slice(0, 3);

                if (matches.length > product.images.length) {
                    console.log(`    ✨ Product ${product.id}: Found ${matches.length} images (Has ${product.images.length})`);

                    let productUpdated = false;
                    for (const match of matches) {
                        // Construir URL teórica para ver si ya la tenemos (evitar descargas innecesarias)
                        // Vercel Blob URLs son impredecibles si no se guardan, así que confiamos en el array product.images
                        // Pero para no subir duplicados, verificamos si el nombre del archivo está en alguna URL del array

                        const alreadyLinked = product.images.some(url => url.includes(encodeURIComponent(match.name)) || url.includes(match.name));

                        if (!alreadyLinked) {
                            console.log(`      ➕ Uploading new variant: ${match.name}`);
                            const url = await uploadImageWithRetry(match.path, `wallpapers/${collectionName}/${match.name}`);

                            if (url) {
                                product.images.push(url);
                                productUpdated = true;
                                updates++;
                            }
                        }
                    }
                    if (productUpdated && !product.imageUrl) {
                        product.imageUrl = product.images[0];
                        product.hasImage = true;
                    }
                }
            }

            if (updates > 0) {
                console.log(`    💾 Saving ${updates} new image links...`);
                await kv.set(`collection:${collectionName}`, products);
                totalEnriched++;
            } else {
                console.log(`    💤 No new images found to add.`);
            }
        }

        console.log(`\n🎉 Enrichment Complete! Updated ${totalEnriched} collections.`);

    } catch (e) {
        console.error('FATAL:', e);
    } finally {
        sftp.end();
    }
}

main();
