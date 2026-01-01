require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function checkStatus() {
    try {
        console.log('🔍 Checking KV "wallpapers_catalog"...');
        const catalog = await kv.get('wallpapers_catalog');

        if (!catalog) {
            console.log('❌ Catalog is NULL or undefined.');
        } else if (Array.isArray(catalog)) {
            console.log(`✅ Catalog found with ${catalog.length} items.`);
            if (catalog.length > 0) {
                const item = catalog[0];
                console.log('--- First Item ---');
                console.log(`ID: ${item.id}`);
                console.log(`Name: ${item.name}`);
                console.log(`Image URL: ${item.imageUrl}`);
                console.log(`In Stock: ${item.inStock}`);
                console.log('------------------');
            }
        } else {
            console.log('⚠️ Catalog is not an array:', typeof catalog);
        }
    } catch (e) {
        console.error('❌ Error reading KV:', e);
    }
}

checkStatus();
