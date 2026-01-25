
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function verify() {
    console.log('🔍 Verifying Gimmersta Data in Vercel KV...\n');

    try {
        // 1. Check Series Index (Collections)
        const seriesIndex = await kv.get('wallpapers_series_index');

        if (!seriesIndex || !Array.isArray(seriesIndex)) {
            console.error('❌ Series index not found or invalid!');
            return;
        }

        const gimmerstaCollections = seriesIndex.filter(c => c.provider === 'Gimmersta');
        console.log(`📚 Found ${gimmerstaCollections.length} Gimmersta collections in index.`);

        if (gimmerstaCollections.length === 0) {
            console.warn('⚠️ No Gimmersta collections found using provider="Gimmersta". Checking by name...');
            // Fallback check if provider wasn't set on some
        }

        // Check Thumbnails
        const withThumbnail = gimmerstaCollections.filter(c => c.thumbnail);
        console.log(`🖼️  Collections with thumbnails: ${withThumbnail.length}/${gimmerstaCollections.length}`);

        if (withThumbnail.length < gimmerstaCollections.length) {
            console.warn('   ⚠️  Some collections are missing thumbnails (likely no images found for any product inside).');
        }

        // 2. Sample Data Verification
        if (gimmerstaCollections.length > 0) {
            const sampleCol = gimmerstaCollections.find(c => c.count > 0 && c.thumbnail) || gimmerstaCollections[0];
            console.log(`\n🕵️  Inspecting sample collection: "${sampleCol.id}"...`);

            const products = await kv.get(`collection:${sampleCol.id}`);

            if (!products || !Array.isArray(products)) {
                console.error('   ❌ Could not load products for this collection!');
            } else {
                console.log(`   ✅ Loaded ${products.length} products.`);

                // Check sample product with image
                const withImg = products.find(p => p.hasImage);
                if (withImg) {
                    console.log('\n   ✅ Sample Product WITH Image:');
                    console.log(`      ID: ${withImg.id}`);
                    console.log(`      Name: ${withImg.name}`);
                    console.log(`      Price: $${withImg.price}`);
                    console.log(`      Dimensions: ${withImg.dimensions}`);
                    console.log(`      Repeat: ${withImg.repeat}`);
                    console.log(`      Image URL: ${withImg.imageUrl}`);
                } else {
                    console.warn('   ⚠️  No products with images found in this sample collection.');
                }

                // Check sample product WITHOUT image (to see data integrity)
                const noImg = products.find(p => !p.hasImage);
                if (noImg) {
                    console.log('\n   ℹ️  Sample Product WITHOUT Image:');
                    console.log(`      ID: ${noImg.id}`);
                    console.log(`      Name: ${noImg.name}`);
                }
            }
        }

    } catch (e) {
        console.error('❌ Error during verification:', e.message);
    }
}

verify();
