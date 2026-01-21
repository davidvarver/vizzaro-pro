require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🕵️  Looking for a sample product with FULL DATA...\n');

    // 1. Get first collection
    const [cursor, keys] = await kv.scan(0, { match: 'collection:*', count: 5 });

    if (keys.length === 0) {
        console.log('❌ No active collections found yet. Wait a bit longer.');
        return;
    }

    // 2. Pick the first collection
    const targetKey = keys[0];
    const collectionName = targetKey.replace('collection:', '');
    const products = await kv.get(targetKey);

    if (!products || products.length === 0) {
        console.log('⚠️ Collection found but empty.');
        return;
    }

    // 3. Find a good product (with image and price)
    const product = products.find(p => p.hasImage && p.price > 0) || products[0];

    // 4. Show Details
    console.log(JSON.stringify({
        COLLECTION: collectionName,
        ID: product.id,
        NAME: product.name,
        PRICE: product.price,
        DESCRIPTION: product.description,
        IMAGE: product.imageUrl,
        DIMENSIONS: `${product.width}" x ${product.rollLength}'`
    }, null, 2));

    console.log('\n✅ This data is LIVE in your database.');
}

main();
