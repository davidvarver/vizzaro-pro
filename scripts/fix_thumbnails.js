const { createClient } = require('@vercel/kv');
require('dotenv').config();

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🚀 Starting Thumbnail Fix...');
    const index = await kv.get('wallpapers_series_index');

    if (!index) {
        console.log('No index found.');
        return;
    }

    let updates = 0;

    for (const item of index) {
        // Only fix if thumbnail is missing
        if (!item.thumbnail || item.thumbnail.length < 5) {
            console.log(`🔍 Checking ${item.name} (${item.id})...`);

            // Fetch products for this collection to get an image
            // We'll try the direct ID. If that fails, we might miss some, but this is a broad sweep.
            let colKey = `collection:${item.id}`;

            // Manual overrides for tricky names we saw earlier, just in case
            if (item.name.includes('Advantage Bali')) colKey = 'collection:Advantage Bali';
            if (item.name.includes('A-Street Select')) colKey = 'collection:A-Street Select - 4021';
            if (item.name.includes('Creation') && item.name.includes('AS')) colKey = 'collection:AS Creation - 4022';

            // Also try to be smart about ' - ####' suffixes in the ID if direct look up fails
            if (!await kv.exists(colKey)) {
                // 1. Try Name
                if (await kv.exists(`collection:${item.name}`)) {
                    colKey = `collection:${item.name}`;
                } else {
                    // 2. Try Name without Suffix (common pattern: "Name - ####")
                    const simpleName = item.name.split(' - ')[0];
                    if (await kv.exists(`collection:${simpleName}`)) {
                        colKey = `collection:${simpleName}`;
                    }
                }
            }

            const products = await kv.get(colKey);

            if (products && products.length > 0) {
                // Find first valid image that isn't a placeholder (if any)
                // Prefer blobs, then anything http
                const valid = products.find(p => p.imageUrl && (p.imageUrl.includes('blob') || p.imageUrl.startsWith('http')));

                if (valid) {
                    item.thumbnail = valid.imageUrl;
                    updates++;
                    console.log(`   ✅ Set thumbnail for ${item.name}: ${valid.imageUrl.substring(0, 50)}...`);
                } else {
                    console.log(`   ⚠️ Products found but no image for ${item.name}`);
                }
            } else {
                console.log(`   ⚠️ Collection key ${colKey} not found or empty.`);
            }
        }
    }

    if (updates > 0) {
        console.log(`💾 Saving ${updates} thumbnail updates to index...`);
        await kv.set('wallpapers_series_index', index);
        console.log('✅ Done.');
    } else {
        console.log('✨ No updates needed.');
    }
}

main();
