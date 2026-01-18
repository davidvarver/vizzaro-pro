require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function run() {
    console.log('Fetching catalog...');
    const catalog = await kv.get('wallpapers_catalog') || [];
    console.log(`Total items: ${catalog.length}`);

    const target = 'ADVANTAGE BALI';
    const items = catalog.filter(i => i.collection && i.collection.toUpperCase().includes(target));

    console.log(`Found ${items.length} items for collection "${target}"`);

    if (items.length > 0) {
        console.log('First item sample:');
        console.log(JSON.stringify(items[0], null, 2));

        const withImages = items.filter(i => i.imageUrl || (i.imageUrls && i.imageUrls.length > 0));
        console.log(`Items with images: ${withImages.length} / ${items.length}`);
    } else {
        console.log('No items found. Listing top 5 collections present:');
        const counts = {};
        catalog.forEach(i => {
            const c = i.collection || 'NONE';
            counts[c] = (counts[c] || 0) + 1;
        });
        console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5));
    }
}

run();
