const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('Scanning keys starting with collection:Advantage...');
    let cursor = 0;
    const found = [];
    do {
        const [nextCursor, keys] = await kv.scan(cursor, { match: 'collection:Advantage*', count: 100 });
        cursor = nextCursor;
        found.push(...keys);
    } while (cursor !== 0 && cursor !== '0');

    console.log('Found keys:', found);
}

main();
