const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    const colName = 'AS Creation - 4022'; // Using the key we found earlier
    const key = `collection:${colName}`;
    const items = await kv.get(key);

    if (!items) {
        console.log(`No items found for key: ${key}`);
        return;
    }

    const total = items.length;
    const withImg = items.filter(i => i.imageUrl && i.imageUrl.includes('blob')).length;

    console.log(`Collection: ${colName}`);
    console.log(`Total Items: ${total}`);
    console.log(`With Image: ${withImg}`);
    console.log(`Coverage: ${((withImg / total) * 100).toFixed(1)}%`);

    if (withImg > 0) {
        console.log('Sample Image:', items.find(i => i.imageUrl).imageUrl);
    }
}

main();
