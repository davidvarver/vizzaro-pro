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

async function main() {
    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

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

            let foundImageDir = null;
            let foundRoomDir = null;

            // Check MAIN IMAGE
            for (const dir of IMAGE_DIRS) {
                const checkPath = `${dir}/${pattern}.jpg`;
                // console.log(`      ? Checking Main: ${checkPath}`); // Reduce log spam
                try {
                    const exists = await sftp.exists(checkPath);
                    if (exists) {
                        console.log(`      ✅ FOUND Main in: ${dir}`);
                        foundImageDir = dir;
                        break;
                    }
                } catch (e) { }
            }

            // Check ROOM IMAGE
            for (const dir of IMAGE_DIRS) {
                const checkPath = `${dir}/${pattern}_Room.jpg`;
                // console.log(`      ? Checking Room: ${checkPath}`);
                try {
                    const exists = await sftp.exists(checkPath);
                    if (exists) {
                        console.log(`      ✅ FOUND Room in: ${dir}`);
                        foundRoomDir = dir;
                        break;
                    }
                } catch (e) { }
            }

            let imageUrl = item.imageUrl || '';
            let imageUrls = item.imageUrls || [];
            let updated = false;

            if (foundImageDir) {
                console.log(`⬇️ Downloading Main...`);
                try {
                    let imgBuffer = await sftp.get(`${foundImageDir}/${pattern}.jpg`);
                    imgBuffer = await addWatermark(imgBuffer);
                    const blob = await put(`products/${pattern}.jpg`, imgBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, allowOverwrite: true });
                    imageUrl = blob.url;
                    if (!imageUrls.includes(imageUrl)) imageUrls.unshift(imageUrl);
                    console.log(`🚀 Uploaded Main: ${blob.url}`);
                    updated = true;
                } catch (err) { console.error('   ❌ Upload failed:', err.message); }
            }

            if (foundRoomDir) {
                console.log(`⬇️ Downloading Room...`);
                try {
                    let roomBuffer = await sftp.get(`${foundRoomDir}/${pattern}_Room.jpg`);
                    const blobRoom = await put(`products/${pattern}_Room.jpg`, roomBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, allowOverwrite: true });
                    if (!imageUrls.includes(blobRoom.url)) imageUrls.push(blobRoom.url);
                    console.log(`🚀 Uploaded Room: ${blobRoom.url}`);
                    updated = true;
                } catch (err) { console.error('   ❌ Upload failed:', err.message); }
            }

            if (updated) {
                // Update Item
                item.imageUrl = imageUrl;
                item.imageUrls = imageUrls;
                item.timestamp = Date.now();

                catalogMap.set(pattern, item);

                // IMMEDIATE SAVE
                // Save regularly to avoid data loss, but maybe not EVERY item to speed up?
                // Actually safer to save every item for now.
                console.log('💾 Saving to KV immediately...');
                const finalBranch = Array.from(catalogMap.values());
                await kv.set('wallpapers_catalog', finalBranch);
                console.log('✅ Saved.');
            } else {
                console.log('   ⏭️ No images found, skipping.');
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        sftp.end();
    }
}

main();
