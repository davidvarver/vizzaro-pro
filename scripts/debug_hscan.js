require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🕵️‍♀️ Debugging HSCAN...');
    try {
        const result = await kv.hscan('wallpapers_catalog_hash', 0, { count: 1 });
        console.log('TYPE:', typeof result);
        console.log('IS ARRAY:', Array.isArray(result));
        console.log('RAW RESULT:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('ERROR:', e);
    }
}
main();
