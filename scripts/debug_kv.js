require('dotenv').config();
const { createClient } = require('@vercel/kv');
const fs = require('fs');

async function debugKv() {
    console.log('🔍 Connecting to Vercel KV...');
    const kv = createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });

    try {
        console.log('📥 Fetching catalog...');
        const catalog = await kv.get('wallpapers_catalog');

        if (!catalog || !Array.isArray(catalog)) {
            console.error('❌ Catalog is null or not an array');
            return;
        }

        const target = 'BREWSTER KIDS';
        console.log(`\n--------------------------------------------------`);
        console.log(`🕵️ Analyzing Collection: "${target}"`);

        const items = catalog.filter(item =>
            item.collection && item.collection.toUpperCase().includes(target)
        );

        console.log(`   Found ${items.length} items.`);

        if (items.length > 0) {
            const sample = items[0];
            fs.writeFileSync('scripts/debug_output.json', JSON.stringify(sample, null, 2));
            console.log('✅ Wrote sample to scripts/debug_output.json');
        } else {
            console.log('   ⚠️ No items found.');
        }
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugKv();
