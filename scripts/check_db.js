require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🔍 Checking Database State...');

    // 1. Check Collection Data
    const collectionKey = 'collection:Advantage Cuba - 4044';
    const collectionData = await kv.get(collectionKey);
    console.log(`\n📂 ${collectionKey}: ${collectionData ? collectionData.length + ' items' : 'MISSING'}`);

    // 2. Check Global Hash
    const hashSize = await kv.hlen('wallpapers_catalog_hash');
    console.log(`🔗 wallpapers_catalog_hash size: ${hashSize}`);

    // 3. Check Series Index (Home Page)
    const seriesIndex = await kv.get('wallpapers_series_index');
    console.log(`📚 wallpapers_series_index: ${seriesIndex ? seriesIndex.length + ' collections' : 'MISSING'}`);

    if (seriesIndex && seriesIndex.length > 0) {
        console.log('\n📋 Sample Series Index Item:');
        console.log(JSON.stringify(seriesIndex[0], null, 2));
    }

    // EXIT EARLY FOR CLEAR OUTPUT
    process.exit(0);

    if (collectionData && collectionData.length > 0) {
        console.log('\n📋 Sample Product from Collection:');
        console.log(JSON.stringify(collectionData[0], null, 2));
    }
}

main();
