require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🔄 Generating Collections Index...');

    // 1. Fetch All Data (Local Node can handle 10mb json usually better than serverless)
    // If this crashes locally, we'll need to paginate hscan.
    let items = [];
    try {
        console.log('   Downloading Hash (this may take time)...');
        const data = await kv.hgetall('wallpapers_catalog_hash');
        items = Object.values(data).map(v => typeof v === 'string' ? JSON.parse(v) : v);
    } catch (e) {
        console.error('❌ Failed to download hash:', e.message);
        return;
    }

    console.log(`   Processing ${items.length} items...`);

    // 2. Aggregate
    const collectionsMap = new Map();

    const findImage = (obj) => {
        if (obj.imageUrls && Array.isArray(obj.imageUrls) && obj.imageUrls.length > 0) return obj.imageUrls[0];
        if (obj.imageUrl && typeof obj.imageUrl === 'string' && obj.imageUrl.length > 5) return obj.imageUrl;
        return null;
    };

    let processed cancel = 0;
    for (const item of items) {
        if (!item.collection) continue;
        const name = item.collection.trim();
        if (!name || name === 'All Data' || name === '300dpi') continue;

        if (!collectionsMap.has(name)) {
            collectionsMap.set(name, {
                id: name,
                name: name,
                count: 0,
                thumbnail: null
            });
        }

        const col = collectionsMap.get(name);
        col.count++;

        if (!col.thumbnail) {
            const img = findImage(item);
            if (img) col.thumbnail = img;
        }
    }

    // 3. Save Manifest
    const manifest = Array.from(collectionsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Found ${manifest.length} Collections.`);
    console.log('   Examples:', manifest.slice(0, 3).map(c => c.name));

    await kv.set('collections_manifest', manifest);
    console.log('💾 Saved to "collections_manifest" in KV.');
}

main();
