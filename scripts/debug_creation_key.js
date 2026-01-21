const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('Fetching index...');

    // Check known potential keys
    const potentials = [
        'collection:AS Creation',
        'collection:AS Creation - 4021', // Unlikely but checking pattern
        'collection:A.S. Creation',
        'collection:AS-Creation'
    ];

    for (const k of potentials) {
        if (await kv.exists(k)) console.log(`✅ FOUND KEY: ${k}`);
    }

    // Also scan index
    const index = await kv.get('wallpapers_series_index');
    if (index) {
        console.log('Scanning index for "creation"...');
        const matches = index.filter(i => i.name.toLowerCase().includes('creation'));
        console.log(JSON.stringify(matches, null, 2));
    }
}

main();
