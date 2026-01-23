require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
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
        let left = Math.floor((metadata.width - watermarkMetadata.width) / 2);
        let top = Math.floor((metadata.height - watermarkMetadata.height) / 2);

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
            console.log(`    📥 Downloading & Processing...`);
            const buffer = await sftp.get(imagePath);
            const processedBuffer = await addWatermark(buffer);
            console.log(`    📤 Uploading to Vercel Pool...`);
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
                console.error(`    💀 Upload failed: ${e.message}`);
                return null;
            }
        }
    }
}

async function main() {
    console.log(`🚀 RECOVERY TOOL: ZERO-IMAGE COLLECTIONS HUNTER`);
    await loadWatermark();

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('✅ SFTP Connected');

        // 1. Get List of Candidates (Collections with NO thumbnail)
        console.log('🔍 Scanning Index for empty collections...');
        const seriesIndex = await kv.get('wallpapers_series_index') || [];

        // Filter: Has ID but NO thumbnail (or empty thumbnail string)
        const candidates = seriesIndex.filter(c => !c.thumbnail || c.thumbnail === '');

        console.log(`\n🎯 Found ${candidates.length} collections with 0 images.`);

        for (const candidate of candidates) {
            const collectionName = candidate.id;
            console.log(`\n==================================================`);
            console.log(`🚑 Recovering: ${collectionName}`);
            console.log(`==================================================`);

            // Find Root Path
            let rootPath = `/WallpaperBooks/${collectionName}`;
            if (!await sftp.exists(rootPath)) {
                // Try simple search if exact path fails
                const books = await sftp.list('/WallpaperBooks');
                const match = books.find(b => b.name.toLowerCase() === collectionName.toLowerCase());
                if (match) rootPath = `/WallpaperBooks/${match.name}`;
                else {
                    console.log(`    ⚠️ Root folder not found. Skipping.`);
                    continue;
                }
            }

            console.log(`    📂 Folder: ${rootPath}`);
            console.log(`    🕵️‍♀️ RECURSIVE SCAN ENABLED...`);

            // RECURSIVE SCAN
            const allImages = await scanRecursive(rootPath);
            console.log(`    📸 Found ${allImages.length} images in tree.`);

            if (allImages.length === 0) {
                console.log(`    ⚠️ Still no images found recursively.`);
                continue;
            }

            // Load Existing Products from KV
            const products = await kv.get(`collection:${collectionName}`);
            if (!products || products.length === 0) {
                console.log('    ⚠️ No products metadata found in DB.');
                continue;
            }

            let updates = 0;
            for (const product of products) {
                if (product.hasImage) continue; // Skip if already has image

                // Attempt Match
                // Logic: Look for image that contains the product ID
                const match = allImages.find(img =>
                    img.name.toLowerCase().includes(product.id.toLowerCase()) ||
                    img.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(product.id.toLowerCase().replace(/[^a-z0-9]/g, ''))
                );

                if (match) {
                    console.log(`    ✨ Matched: ${product.id} -> ${match.name}`);
                    const url = await uploadImageWithRetry(match.path, `wallpapers/${collectionName}/${match.name}`);

                    if (url) {
                        product.imageUrl = url;
                        product.hasImage = true;
                        updates++;
                    }
                }
            }

            if (updates > 0) {
                console.log(`    💾 Saving ${updates} recovered images...`);
                await kv.set(`collection:${collectionName}`, products);

                // Update Index Thumbnail
                const firstImg = products.find(p => p.hasImage);
                if (firstImg) {
                    candidate.thumbnail = firstImg.imageUrl;
                    // Update the main index array in memory
                    const idx = seriesIndex.findIndex(i => i.id === collectionName);
                    if (idx !== -1) seriesIndex[idx] = candidate;

                    // Save Index immediately to prevent sync issues
                    await kv.set('wallpapers_series_index', seriesIndex);
                    console.log('    📚 Series Index updated.');
                }
            } else {
                console.log('    💤 No matches found for products.');
            }
        }

    } catch (e) {
        console.error('FATAL:', e);
    } finally {
        sftp.end();
        console.log('\n✅ Recovery Pass Complete.');
    }
}

main();
