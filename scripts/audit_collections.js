
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function auditCollections() {
    console.log('🕵️  Starting Collection Audit...\n');

    try {
        // 1. Get All Collections (Series Index)
        const seriesIndex = await kv.get('wallpapers_series_index');
        if (!seriesIndex || !Array.isArray(seriesIndex)) {
            console.error('❌ No collections found in index.');
            return;
        }

        console.log(`📚 Total Collections Found: ${seriesIndex.length}`);

        const missingCovers = [];
        const fullAudit = [];

        // 2. Iterate and Check
        for (const col of seriesIndex) {
            let status = 'OK';
            let reason = '';

            if (!col.thumbnail) {
                status = 'MISSING_COVER';

                // Deep dive: Check products in this collection
                const products = await kv.get(`collection:${col.id}`);
                const totalProducts = products ? products.length : 0;

                if (totalProducts === 0) {
                    reason = 'EMPTY_COLLECTION (No Products)';
                } else {
                    const productsWithImages = products.filter(p => p.imageUrls && p.imageUrls.length > 0 && !p.imageUrl.includes('placeholder'));
                    if (productsWithImages.length === 0) {
                        reason = `NO_IMAGES_FOUND (Checked ${totalProducts} products)`;
                    } else {
                        reason = `HAS_IMAGES_BUT_NO_COVER (Found ${productsWithImages.length} candidates)`;
                        // This implies a logic bug in the sync script not picking one
                    }
                }

                missingCovers.push({
                    name: col.id,
                    provider: col.provider || 'York', // Default to York if undefined
                    reason: reason,
                    totalProducts: totalProducts
                });
            }

            fullAudit.push({ name: col.id, hasCover: !!col.thumbnail, status });
        }

        // 3. Report Results
        console.log('\n📊 AUDIT RESULTS');
        console.log('================');
        console.log(`✅ Collections with Covers: ${seriesIndex.length - missingCovers.length}`);
        console.log(`❌ Collections MISSING Covers: ${missingCovers.length}`);

        if (missingCovers.length > 0) {
            console.log('\n🛑 BREAKDOWN OF MISSING COVERS:');

            // Group by Reason
            const byReason = {};
            missingCovers.forEach(c => {
                if (!byReason[c.reason]) byReason[c.reason] = [];
                byReason[c.reason].push(c.name);
            });

            for (const [r, names] of Object.entries(byReason)) {
                console.log(`\n👉 ${r} (${names.length}):`);
                console.log(`   Examples: ${names.slice(0, 5).join(', ')}${names.length > 5 ? '...' : ''}`);
            }

            // Group by Provider
            console.log('\n🛑 BREAKDOWN BY PROVIDER:');
            const byProvider = {};
            missingCovers.forEach(c => {
                const p = c.provider || 'Unknown';
                if (!byProvider[p]) byProvider[p] = 0;
                byProvider[p]++;
            });
            console.log(JSON.stringify(byProvider, null, 2));
        }

    } catch (e) {
        console.error('❌ Error during audit:', e);
    }
}

auditCollections();
