
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function checkSize() {
    try {
        console.log('Fetching catalog metadata...');
        // We can't easily get "size" without fetching, but we can try LLEN (if it was a list) but it's a string JSON.
        // So we just fetch it.
        const start = Date.now();
        const catalog = await kv.get('wallpapers_catalog');
        const end = Date.now();

        if (!catalog) {
            console.log('❌ Catalog is empty or null');
            return;
        }

        const jsonString = JSON.stringify(catalog);
        const sizeBytes = Buffer.byteLength(jsonString, 'utf8');
        const sizeMB = sizeBytes / (1024 * 1024);

        console.log(`✅ Fetch Success in ${end - start}ms`);
        console.log(`📊 Item Count: ${catalog.length}`);
        console.log(`📦 Estimated Size: ${sizeMB.toFixed(2)} MB`);

        if (sizeMB > 4) {
            console.warn('⚠️  WARNING: Size exceeds Vercel Serverless Body Limit (~4.5MB)');
        }

        // Simulate Lite Mode
        const liteCatalog = catalog.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            collection: item.collection,
            category: item.category,
            imageUrl: item.imageUrl,
            group: item.group,
            style: item.style,
            inStock: item.inStock
        }));

        const liteJson = JSON.stringify(liteCatalog);
        const liteSizeMB = Buffer.byteLength(liteJson, 'utf8') / (1024 * 1024);
        console.log(`📦 Estimated Lite Size: ${liteSizeMB.toFixed(2)} MB`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

checkSize();
