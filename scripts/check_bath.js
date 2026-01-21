const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('Fetching Advantage Bath...');

    // Try both keys to be sure
    const keys = ['collection:Advantage Bath - 2814', 'collection:Advantage Bath'];

    for (const k of keys) {
        console.log(`\nChecking key: ${k}`);
        const items = await kv.get(k);
        if (items) {
            console.log(`Count: ${items.length}`);
            if (items.length > 0) {
                console.log('First item:', JSON.stringify(items[0], null, 2));
                // Check how many have images
                const withImg = items.filter(i => i.imageUrl && i.imageUrl.includes('blob'));
                console.log(`Items with Blob images: ${withImg.length}`);
            }
        } else {
            console.log('Key not found.');
        }
    }
}

main();
