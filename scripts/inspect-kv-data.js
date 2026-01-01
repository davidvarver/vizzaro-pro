// scripts/inspect-kv-data.js
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function inspect() {
    try {
        console.log('Fetching wallpapers_catalog...');
        const catalog = await kv.get('wallpapers_catalog');

        if (catalog && Array.isArray(catalog) && catalog.length > 0) {
            console.log(`Found ${catalog.length} items.`);
            console.log('--- FIRST ITEM RAW JSON ---');
            console.log(JSON.stringify(catalog[0], null, 2));
        } else {
            console.log('Catalog is empty or invalid.');
            console.log('Raw value:', catalog);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

inspect();
