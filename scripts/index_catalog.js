require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🚀 Starting Catalog Indexing...');

    // We need to scan the HASH safely
    let cursor = 0;
    const allItems = [];

    try {
        do {
            const result = await kv.hscan('wallpapers_catalog_hash', cursor, { count: 500 });
            cursor = result[0];
            const rawFields = result[1];

            for (let i = 0; i < rawFields.length; i += 2) {
                try {
                    const rawVal = rawFields[i + 1];
                    const item = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
                    // Debug sample
                    if (allItems.length === 0) {
                        console.log('🔍 First Item Sample:', JSON.stringify(item, null, 2));
                    }
                    allItems.push(item);
                } catch (e) {
                    // ignore parse error
                }
            }

            process.stdout.write(`\r📥 Scanned ${allItems.length} items...`);

        } while (cursor !== 0 && cursor !== "0");

        console.log(`\n✅ Loaded ${allItems.length} items.`);

        // 1. Group by Collection
        const collectionMap = {};

        for (const item of allItems) {
            if (!item.collection) continue;
            const colName = item.collection.trim();
            if (!collectionMap[colName]) {
                collectionMap[colName] = [];
            }
            collectionMap[colName].push(item);
        }

        const collectionNames = Object.keys(collectionMap).sort();
        console.log(`📚 Found ${collectionNames.length} unique collections.`);

        // 2. Build Series Index (Lightweight)
        const seriesIndex = [];

        for (const name of collectionNames) {
            const items = collectionMap[name];

            // Find best thumbnail
            let thumb = items.find(i => i.imageUrl && i.imageUrl.length > 5)?.imageUrl || '';

            seriesIndex.push({
                id: name,
                name: name,
                count: items.length,
                thumbnail: thumb
            });

            // 3. Save "Per-Collection" Key
            const colKey = `collection:${name}`;
            await kv.set(colKey, items);
        }

        // 4. Save Series Index
        await kv.set('wallpapers_series_index', seriesIndex);
        console.log('✅ Saved wallpapers_series_index');

        console.log('✨ Indexing Complete!');

    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

main();
