const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('Fetching keys...');

    // Check possible variations
    const keysToCheck = [
        'collection:A-Street Select',
        'collection:A-Street Select - 4021',
        'collection:A-Street Prints',
        'collection:A-Street Prints - 4021'
    ];

    for (const key of keysToCheck) {
        const items = await kv.get(key);
        if (items) {
            console.log(`✅ FOUND: ${key} (${items.length} items)`);
        } else {
            console.log(`❌ MISSING: ${key}`);
        }
    }
}

main();
