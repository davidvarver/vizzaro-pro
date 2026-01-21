const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('Fetching keys...');
    // Scan for keys starting with collection:
    // keys() command is dangerous in prod if too many keys, but for collection:* it should be ~100.
    // However, KV doesn't support 'keys' well in some tiers.
    // Better to fetch 'wallpapers_series_index' and see names there.

    const index = await kv.get('wallpapers_series_index');
    if (index) {
        console.log('Found Series Index. Filtering for "Street"...');
        const matches = index.filter(i => i.name.toLowerCase().includes('street'));
        console.log(JSON.stringify(matches, null, 2));
    } else {
        console.log('No index found.');
    }
}

main();
