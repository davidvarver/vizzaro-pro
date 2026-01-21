require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🔍 Checking Database Progress...\n');

    // 1. Scan for collection keys
    let cursor = 0;
    const foundKeys = [];

    do {
        const result = await kv.scan(cursor, { match: 'collection:*', count: 100 });
        cursor = result[0];
        foundKeys.push(...result[1]);
    } while (cursor !== 0 && cursor !== '0');

    if (foundKeys.length === 0) {
        console.log('❌ No collections found in database yet.');
        console.log('   (Wait a minute for the first batch to save)');
        return;
    }

    console.log(`✅ Found ${foundKeys.length} active collections in DB:\n`);

    for (const key of foundKeys) {
        const items = await kv.get(key);
        const count = items ? items.length : 0;
        const name = key.replace('collection:', '');
        const withImages = items ? items.filter(i => i.hasImage).length : 0;

        console.log(`   📂 ${name}`);
        console.log(`      products: ${count}`);
        console.log(`      images:   ${withImages}`);
        console.log('------------------------------');
    }
}

main();
