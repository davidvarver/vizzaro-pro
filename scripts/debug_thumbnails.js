
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function checkThumbnails() {
    console.log('🔍 Checking Gimmersta Thumbnails...\n');
    const seriesIndex = await kv.get('wallpapers_series_index');
    if (!seriesIndex) return console.log('No index found.');

    const gimmerstaCols = seriesIndex.filter(c => c.provider === 'Gimmersta');

    console.log(`Total Gimmersta Collections: ${gimmerstaCols.length}`);
    const missing = gimmerstaCols.filter(c => !c.thumbnail);
    console.log(`❌ Missing Thumbnails: ${missing.length}`);

    if (missing.length > 0) {
        console.log('\n--- ATTEMPTING TO FIX MISSING THUMBNAILS ---');
        let fixedCount = 0;

        for (const col of missing) {
            console.log(`Checking collection: ${col.id}...`);
            const products = await kv.get(`collection:${col.id}`);

            if (products && products.length > 0) {
                const firstWithImg = products.find(p => p.imageUrl);
                if (firstWithImg) {
                    console.log(`   ✅ Found image in product ${firstWithImg.id}: ${firstWithImg.imageUrl}`);
                    col.thumbnail = firstWithImg.imageUrl;
                    fixedCount++;
                } else {
                    console.log('   ⚠️ No images found in any product for this collection.');
                }
            } else {
                console.log('   ⚠️ Collection has no products.');
            }
        }

        if (fixedCount > 0) {
            console.log(`\n💾 Saving ${fixedCount} fixes to KV...`);
            await kv.set('wallpapers_series_index', seriesIndex);
            console.log('✅ Index updated!');
        } else {
            console.log('\nℹ️ No fixes possible (no images available).');
        }
    }
}

checkThumbnails();
