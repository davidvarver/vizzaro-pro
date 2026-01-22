require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🖼️  FIX THUMBNAILS TOOL');
    console.log('-----------------------');

    try {
        // 1. Get current index
        const index = await kv.get('wallpapers_series_index') || [];
        console.log(`📚 Found ${index.length} collections in index.`);

        const newIndex = [];
        let updatedCount = 0;

        for (const item of index) {
            const collectionName = typeof item === 'string' ? item : item.id;
            console.log(`🔎 Processing: ${collectionName}...`);

            // Fetch collection data to find a thumbnail
            const products = await kv.get(`collection:${collectionName}`);

            if (products && Array.isArray(products) && products.length > 0) {
                // Find first product with a thumbnail
                const thumbProduct = products.find(p => p.thumbnail);
                const thumbnail = thumbProduct ? thumbProduct.thumbnail : null;

                newIndex.push({
                    id: collectionName,
                    name: collectionName,
                    count: products.length,
                    thumbnail: thumbnail
                });
                console.log(`   ✅ Found thumbnail: ${thumbnail ? 'Yes' : 'No'} (${products.length} items)`);
                updatedCount++;
            } else {
                console.log(`   ⚠️ No data found for collection, keeping original entry.`);
                // Keep original or create empty object? 
                // Better to keep object structure consistent
                newIndex.push(typeof item === 'object' ? item : {
                    id: collectionName,
                    name: collectionName,
                    count: 0,
                    thumbnail: null
                });
            }
        }

        // 2. Save updated index
        console.log('\n💾 Saving updated index...');
        await kv.set('wallpapers_series_index', newIndex);
        console.log('✨ Done! Index upgraded.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
