require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🕵️‍♀️ Checking stored index...');
    try {
        const index = await kv.get('wallpapers_series_index');

        if (!index) {
            console.error('❌ Index is NULL!');
        } else if (!Array.isArray(index)) {
            console.error('❌ Index is not an array:', typeof index);
        } else {
            console.log(`✅ Index found with ${index.length} collections.`);
            console.log('Sample 1:', index[0]);
            console.log('Sample 2:', index[1]);
        }

    } catch (e) {
        console.error('ERROR:', e);
    }
}
main();
