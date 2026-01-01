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

        // Check Set Count (Real-time progress)
        const count = await kv.scard('wallpapers:ids');
        console.log(`📊 SCARD (wallpapers:ids): ${count}`);

        if (!catalog) {
            console.log('❌ COUNT: 0 (Catalog NULL)');
        } else if (Array.isArray(catalog)) {
            console.log(`✅ COUNT: ${catalog.length}`);
            if (catalog.length > 0) {
                console.log(`LAST ITEM: ${catalog[catalog.length - 1].id}`);
            }
        } else {
            console.log('⚠️ Catalog is not an array:', typeof catalog);
        }
    } catch (e) {
        console.error('❌ Error reading KV:', e);
    }
}

checkStatus();
