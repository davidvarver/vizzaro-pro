require('dotenv').config();
const { createClient } = require('@vercel/kv');
const fs = require('fs');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    try {
        const data = await kv.hgetall('wallpapers_catalog_hash');
        if (!data) return console.log('No data');

        const keys = Object.keys(data);
        if (keys.length === 0) return console.log('Empty keys');

        // Pick a random key or the first one
        const key = keys[0];
        const val = data[key];

        console.log('--- RAW VALUE START ---');
        console.log(typeof val === 'string' ? val : JSON.stringify(val));
        console.log('--- RAW VALUE END ---');

        fs.writeFileSync('item_dump.json', JSON.stringify({ key, value: typeof val === 'string' ? JSON.parse(val) : val }, null, 2));

    } catch (e) {
        console.error(e);
    }
}

main();
