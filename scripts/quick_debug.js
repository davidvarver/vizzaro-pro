require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    const count = await kv.hlen('wallpapers_catalog_hash');
    console.log(`📊 TOTAL ITEMS IN DB: ${count}`);
    console.log('(Skipping detailed list to avoid memory crash)');
}
main();
