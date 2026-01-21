require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🔍 inspecting hash...');
    const id = '2814-21627';
    const raw = await kv.hget('wallpapers_catalog_hash', id);
    if (!raw) {
        console.log('❌ Item not found in hash:', id);

        // Try searching keys?
        console.log('Scanning for keys starting with 2814-...');
        const keys = await kv.hkeys('wallpapers_catalog_hash');
        const match = keys.find(k => k.startsWith('2814-'));
        if (match) {
            console.log('Found similar key:', match);
            const raw2 = await kv.hget('wallpapers_catalog_hash', match);
            console.log(raw2);
        }
    } else {
        console.log('✅ Found item:');
        console.log(JSON.stringify(raw, null, 2));
    }
}

main();
