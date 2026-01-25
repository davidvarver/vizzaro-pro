
require('dotenv').config();
const { put, list } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// --- CONFIG ---
const CONFIG = {
    IMAGES_DIR: './imagenes gimmersta', // Asegúrate de que este directorio existe y tiene las fotos
    WATERMARK: {
        enabled: true,
        logoPath: './assets/images/logo-header.png',
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
                    baseName: path.parse(file.name).name.toLowerCase(), // Nombre sin extensión y minúsculas
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

// --- WATERMARK SYSTEM (Simplified) ---
let watermarkBuffer = null;
async function loadWatermark() {
    try {
        watermarkBuffer = await fs.readFile(CONFIG.WATERMARK.logoPath);
        console.log(`✅ Watermark loaded`);
    } catch (e) {
        console.warn(`⚠️ Watermark not found, skipping`);
    }
}

async function addWatermark(imageBuffer) {
    if (!watermarkBuffer) return imageBuffer;
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
    } catch (e) { return imageBuffer; }
}

async function uploadImage(localPath, remotePath) {
    // Check exist
    try {
        const { blobs } = await list({ prefix: remotePath, limit: 1, token: process.env.BLOB_READ_WRITE_TOKEN });
        if (blobs.length > 0) return blobs[0].url;
    } catch (e) { }

    // Upload
    try {
        const buffer = await fs.readFile(localPath);
        const processed = await addWatermark(buffer);
        const blob = await put(remotePath, processed, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: false
        });
        return blob.url;
    } catch (e) {
        console.error(`Error uploading: ${e.message}`);
        return null;
    }
}

// --- HUNTER LOGIC ---
async function runHunter() {
    console.log('🦅 STARTING GIMMERSTA IMAGE HUNTER...');
    await loadWatermark();

    // 1. Get Collections
    const seriesIndex = await kv.get('wallpapers_series_index');
    const ghostCollections = [];

    // Filter for Gimmersta collections without thumbnails (or we can just check all Gimmersta)
    for (const col of seriesIndex) {
        if (!col.thumbnail && (col.provider === 'Gimmersta' || col.id.toLowerCase().includes('gimmersta') || !col.provider)) {
            // Verify it has products but no images
            const products = await kv.get(`collection:${col.id}`);
            if (products && products.length > 0) {
                const hasImages = products.some(p => p.hasImage && !p.imageUrl.includes('placeholder'));
                if (!hasImages) {
                    ghostCollections.push({ id: col.id, products });
                }
            }
        }
    }

    console.log(`👻 Found ${ghostCollections.length} ghost collections from Gimmersta.`);

    // 2. Scan Local Images
    console.log('📂 Scanning local images...');
    const allImages = await scanLocalImagesRecursive(CONFIG.IMAGES_DIR);
    console.log(`📸 Found ${allImages.length} local images available for hunting.`);

    let totalFixed = 0;

    // 3. Hunt!
    for (const col of ghostCollections) {
        console.log(`\n🕵️ Hunting for collection: ${col.id} (${col.products.length} products)`);
        let collectionModified = false;

        for (const product of col.products) {
            // Fuzzy Match Logic
            const id = product.id.toLowerCase().trim(); // e.g. "123-45"
            const idNoDash = id.replace(/[^a-z0-9]/g, ''); // e.g. "12345"
            const idNumbers = id.match(/\d+/g)?.join('') || idNoDash; // e.g. "12345"

            // CANDIDATES
            const candidates = allImages.filter(img => {
                const imgName = img.baseName;

                // Rule 1: Exact match with clean ID
                if (imgName === id) return true;
                if (imgName === idNoDash) return true;

                // Rule 2: Contains ID (e.g. wall_12345_room.jpg)
                if (imgName.includes(id)) return true;
                if (imgName.includes(idNoDash)) return true;

                return false;
            });

            if (candidates.length > 0) {
                console.log(`   🎯 MATCH FOUND for ${product.id} -> ${candidates[0].name} (+${candidates.length - 1} more)`);

                const imageUrls = [];
                // Upload top 3 matches
                for (const match of candidates.slice(0, 3)) {
                    const url = await uploadImage(match.path, `wallpapers/gimmersta/${col.id}/${match.name}`);
                    if (url) imageUrls.push(url);
                }

                if (imageUrls.length > 0) {
                    product.images = imageUrls;
                    product.imageUrl = imageUrls[0];
                    product.hasImage = true;
                    collectionModified = true;
                    totalFixed++;
                }
            }
        }

        // Save if modified
        if (collectionModified) {
            console.log(`   💾 Saving repaired collection: ${col.id}`);
            await kv.set(`collection:${col.id}`, col.products);

            // Update Series Index Thumbnail
            const firstImg = col.products.find(p => p.hasImage)?.imageUrl;
            if (firstImg) {
                const idxEntry = seriesIndex.find(c => c.id === col.id);
                if (idxEntry) {
                    idxEntry.thumbnail = firstImg;
                    idxEntry.provider = 'Gimmersta'; // Ensure provider is set
                }
            }
        } else {
            console.log(`   ❌ No matches found for ANY product in ${col.id}`);
        }
    }

    // Save Index
    await kv.set('wallpapers_series_index', seriesIndex);
    console.log(`\n✨ HUNT COMPLETE. Fixed ${totalFixed} products.`);
}

runHunter();
