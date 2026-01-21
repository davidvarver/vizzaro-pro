const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('Fetching series index...');
    const index = await kv.get('wallpapers_series_index');

    if (!index) {
        console.log('No index found.');
        return;
    }

    const targets = ['Advantage Bath', 'Advantage Cuba', 'Advantage Beyond', 'Advantage Curio', 'Advantage Deluxe', 'Advantage Fusion', 'Advantage Geo'];

    // Filter strictly for our targets to see their status
    const interesting = index.filter(i => targets.some(t => i.id.includes(t) || i.name.includes(t)));

    console.log(JSON.stringify(interesting, null, 2));
}

main();
