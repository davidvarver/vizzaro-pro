require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const sharp = require('sharp');

const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
};

const IMAGE_DIRS = [
    '/New Products/All Images',
    '/WallpaperBooks/1 All Wallpaper Images/Images',
    '/WallpaperBooks/Brewster Kids - 2886'
];

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
              font-family: sans-serif;
              stroke: rgba(0, 0, 0, 0.4);
              stroke-width: ${Math.max(1, fontSize * 0.03)}px;
              paint-order: stroke;
            }
          </style>
          <text x="50%" y="50%" text-anchor="middle" class="title">vizzarowallpaper.com</text>
        </svg>
        `;
        return await image.composite([{ input: Buffer.from(svgImage), top: 0, left: 0, gravity: 'center' }]).toBuffer();
    } catch (error) {
        console.error('   ⚠️ Error adding watermark:', error.message);
        return imageBuffer;
    }
}

const filesMap = new Map(); // filename.toLowerCase() -> fullPath

async function preCacheFiles() {
    console.log('📂 Pre-caching file lists from image directories...');

    for (const dir of IMAGE_DIRS) {
        try {
            console.log(`   Listing ${dir}...`);
            const items = await sftp.list(dir);
            let count = 0;
            for (const item of items) {
                if (item.type === '-') {
                    const lowerName = item.name.toLowerCase();
                    // Store strict path. If duplicates, first one wins (or last, doesn't matter much)
                    if (!filesMap.has(lowerName)) {
                        filesMap.set(lowerName, { dir, name: item.name });
                        count++;
                    }
                }
            }
            console.log(`   ✅ Cached ${count} files from ${dir}`);
        } catch (e) {
            console.warn(`   ⚠️ Could not list ${dir}: ${e.message}`);
        }
    }
    console.log(`📚 Total cached files: ${filesMap.size}`);
}

async function main() {
    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        // PRE-CACHE
        await preCacheFiles();

        console.log('💾 Fetching Catalog from KV (Repair Mode)...');
        let existingCatalog = await kv.get('wallpapers_catalog') || [];
        console.log(`📊 Catalog size: ${existingCatalog.length} items.`);

        // REPAIR ALL MISSING IMAGES
        console.log('🧹 Filtering for items needing repair (missing images)...');
        const pendingItems = existingCatalog.filter(i =>
            (!i.imageUrl || i.imageUrl.length < 5) &&
            (!i.imageUrls || i.imageUrls.length === 0)
        );

        console.log(`🎯 Found ${pendingItems.length} items in KV missing images.`);

        if (pendingItems.length === 0) {
            console.log('✅ No items need repair!');
            return;
        }

        const catalogMap = new Map();
        existingCatalog.forEach(item => catalogMap.set(item.id, item));

        let processedCount = 0;

        for (const item of pendingItems) {
            processedCount++;
            const pattern = item.id;
            console.log(`\n[${processedCount}/${pendingItems.length}] 🔎 Processing ${pattern} (REPAIR MODE)`);

            // LOOKUP IN CACHE
            // Try exact pattern + .jpg
            const mainCandidates = [`${pattern}.jpg`, `${pattern}.jpeg`, `${pattern}.png`, `MD${pattern}.jpg`];
            const roomCandidates = [`${pattern}_Room.jpg`, `${pattern}_room.jpg`];

            let foundImage = null;
            let foundRoom = null;

            for (const cand of mainCandidates) {
                const match = filesMap.get(cand.toLowerCase());
                if (match) {
                    foundImage = match;
                    console.log(`      ✅ FOUND Main: ${match.dir}/${match.name}`);
                    break;
                }
            }

            for (const cand of roomCandidates) {
                const match = filesMap.get(cand.toLowerCase());
                if (match) {
                    foundRoom = match;
                    console.log(`      ✅ FOUND Room: ${match.dir}/${match.name}`);
                    break;
                }
            }

            let imageUrl = item.imageUrl || '';
            let imageUrls = item.imageUrls || [];
            let updated = false;

            if (foundImage) {
                console.log(`⬇️ Downloading Main...`);
                try {
                    let imgBuffer = await sftp.get(`${foundImage.dir}/${foundImage.name}`);
                    imgBuffer = await addWatermark(imgBuffer);
                    const blob = await put(`products/${pattern}.jpg`, imgBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, allowOverwrite: true });
                    imageUrl = blob.url;
                    if (!imageUrls.includes(imageUrl)) imageUrls.unshift(imageUrl);
                    console.log(`🚀 Uploaded Main: ${blob.url}`);
                    updated = true;
                } catch (err) { console.error('   ❌ Upload failed:', err.message); }
            }

            if (foundRoom) {
                console.log(`⬇️ Downloading Room...`);
                try {
                    let roomBuffer = await sftp.get(`${foundRoom.dir}/${foundRoom.name}`);
                    const blobRoom = await put(`products/${pattern}_Room.jpg`, roomBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, allowOverwrite: true });
                    if (!imageUrls.includes(blobRoom.url)) imageUrls.push(blobRoom.url);
                    console.log(`🚀 Uploaded Room: ${blobRoom.url}`);
                    updated = true;
                } catch (err) { console.error('   ❌ Upload failed:', err.message); }
            }

            if (updated) {
                item.imageUrl = imageUrl;
                item.imageUrls = imageUrls;
                item.timestamp = Date.now();
                catalogMap.set(pattern, item);

                console.log('💾 Saving to KV immediately...');
                const finalBranch = Array.from(catalogMap.values());
                await kv.set('wallpapers_catalog', finalBranch);
                console.log('✅ Saved.');
            } else {
                console.log('   ⏭️ No images found in cached paths, skipping.');
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        sftp.end();
    }
}

main();
