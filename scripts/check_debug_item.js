require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🔍 Searching for an item from "Advantage Bali"...');
    const data = await kv.hgetall('wallpapers_catalog_hash');

    if (!data) return console.log('❌ Hash is empty.');

    const keys = Object.keys(data);
    let found = null;

    for (const key of keys) {
        let item = data[key];
        if (typeof item === 'string') item = JSON.parse(item);

        // Check if it belongs to the collection we saw in the logs
        if (item.collection && item.collection.includes('Advantage Bali')) {
            found = item;
            break;
        }
    }

    if (found) {
        console.log('✅ Found Item in DB:');
        console.log('ID:', found.id);
        console.log('Name:', found.name);
        console.log('Collection:', found.collection);
        console.log('ImageUrl:', found.imageUrl); // <--- CRITICAL CHECK
        console.log('ImageUrls Array:', found.imageUrls);
        console.log('Full Object:', JSON.stringify(found, null, 2));
    } else {
        console.log('❌ No items found for Advantage Bali.');
    }
}

main();
