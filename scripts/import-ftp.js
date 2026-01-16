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
            // 1. Main Image
            const mainCandidates = [`${pattern}.jpg`, `${pattern}.jpeg`, `${pattern}.png`, `MD${pattern}.jpg`];
            let foundImage = null;
            for (const cand of mainCandidates) {
                const match = filesMap.get(cand.toLowerCase());
                if (match) {
                    foundImage = match;
                    console.log(`      ✅ FOUND Main: ${match.dir}/${match.name}`);
                    break;
                }
            }

            // 2. Extra Variants (Room, Detail, Numbered)
            // We search for these patterns and add them to the gallery
            const variantsToCheck = [
                { suffix: '_Room', label: 'Room' },
                { suffix: '_room', label: 'Room' },
                { suffix: '_Detail', label: 'Detail' },
                { suffix: '_detail', label: 'Detail' },
                { suffix: '_Alt', label: 'Alt' },
                { suffix: '_alt', label: 'Alt' },
                { suffix: '_2', label: 'Var 2' },
                { suffix: '_3', label: 'Var 3' },
                { suffix: '_4', label: 'Var 4' },
                { suffix: '_5', label: 'Var 5' },
                { suffix: '-2', label: 'Var 2' }, // sometimes dash?
                { suffix: '-3', label: 'Var 3' },
                { suffix: ' Folder', label: 'Folder' } // rare
            ];

            let foundVariants = [];

            for (const v of variantsToCheck) {
                const candName = `${pattern}${v.suffix}.jpg`; // Try jpg only for now variants usually jpg
                const match = filesMap.get(candName.toLowerCase());
                if (match) {
                    // Check if already found (case insensitivity might cause duplicates otherwise)
                    if (!foundVariants.some(fv => fv.match.name === match.name)) {
                        foundVariants.push({ match, label: v.label });
                        console.log(`      ✅ FOUND ${v.label}: ${match.dir}/${match.name}`);
                    }
                }
            }

            let imageUrl = item.imageUrl || '';
            let imageUrls = item.imageUrls || [];
            let updated = false;

            // Upload Main
            if (foundImage) {
                // If main image is missing or valid
                console.log(`⬇️ Downloading Main...`);
                try {
                    let imgBuffer = await sftp.get(`${foundImage.dir}/${foundImage.name}`);
                    imgBuffer = await addWatermark(imgBuffer);
                    const blob = await put(`products/${pattern}.jpg`, imgBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, allowOverwrite: true });

                    // Update Main URL
                    imageUrl = blob.url;

                    // Add to gallery if not present
                    if (!imageUrls.includes(imageUrl)) imageUrls.unshift(imageUrl);

                    console.log(`🚀 Uploaded Main: ${blob.url}`);
                    updated = true;

                } catch (err) { console.error('   ❌ Upload Main failed:', err.message); }
            }

            // Upload Variants
            for (const v of foundVariants) {
                console.log(`⬇️ Downloading ${v.label}...`);
                try {
                    // Start download
                    let vBuffer = await sftp.get(`${v.match.dir}/${v.match.name}`);
                    // Only watermark if it's large? Let's watermark all for consistency
                    if (v.label !== 'Detail') { // Maybe skip watermark for tiny details? No, safe to add.
                        // vBuffer = await addWatermark(vBuffer); // Optional: Watermark everything
                    }

                    const blobName = `products/${v.match.name}`; // Use original filename for variants to avoid collisions
                    const blobV = await put(blobName, vBuffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, allowOverwrite: true });

                    if (!imageUrls.includes(blobV.url)) {
                        imageUrls.push(blobV.url);
                        updated = true;
                    }
                    console.log(`🚀 Uploaded ${v.label}: ${blobV.url}`);

                } catch (err) { console.error(`   ❌ Upload ${v.label} failed:`, err.message); }
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
