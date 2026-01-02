const { createClient } = require('@vercel/kv');
require('dotenv').config();

async function checkCount() {
    try {
        console.log('🔌 Connecting to KV Database...');

        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            console.error('❌ Missing KV credentials in .env');
            return;
        }

        const kv = createClient({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        console.log('📊 Fetching item count...');
        const catalog = await kv.get('wallpapers_catalog');

        if (!catalog) {
            console.log('⚠️ Catalog is null or undefined.');
        } else if (Array.isArray(catalog)) {
            console.log(`✅ Total items in Database: ${catalog.length}`);

            // Optional: Print a few IDs to verify
            const sample = catalog.slice(0, 3).map(i => i.id).join(', ');
            console.log(`   Sample IDs: ${sample}...`);
        } else {
            console.log('⚠️ Catalog exists but is not an array.');
        }

    } catch (error) {
        console.error('❌ Error checking KV:', error);
    }
}

checkCount();
