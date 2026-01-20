require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🕵️‍♀️ Debugging Scan Loop...');
    try {
        const result = await kv.hscan('wallpapers_catalog_hash', 0, { count: 1 });
        const rawFields = result[1];

        console.log('Number of fields returned:', rawFields.length);
        if (rawFields.length >= 2) {
            const key = rawFields[0];
            const val = rawFields[1];

            console.log('KEY:', key);
            console.log('VAL TYPE:', typeof val);
            if (typeof val === 'object') {
                console.log('VAL IS OBJECT:', JSON.stringify(val).substring(0, 50) + '...');
            } else {
                console.log('VAL IS STRING:', val.substring(0, 50) + '...');
            }
        }
    } catch (e) {
        console.error('ERROR:', e);
    }
}
main();
