require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    const data = await kv.hgetall('wallpapers_catalog_hash');
    const keys = Object.keys(data);
    for (const key of keys) {
        let item = data[key];
        if (typeof item === 'string') item = JSON.parse(item);
        if (item.collection && item.collection.includes('Advantage Bali')) {
            console.log('ITEM_ID:', item.id);
            console.log('IMAGE_URL:', item.imageUrl);
            console.log('URL_LENGTH:', item.imageUrl ? item.imageUrl.length : 0);
            process.exit(0);
        }
    }
}
main();
