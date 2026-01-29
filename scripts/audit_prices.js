require('dotenv').config();
const { createClient } = require('@vercel/kv');
const fs = require('fs').promises;
const path = require('path');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const REPORT_FILE = 'audit_report.txt';

async function auditPrices() {
    console.log('🕵️ STARTING PRICE AUDIT...\n');

    try {
        // 1. Get List of Collections
        console.log('📚 Fetching Series Index...');
        const seriesIndex = await kv.get('wallpapers_series_index');

        if (!seriesIndex || !Array.isArray(seriesIndex)) {
            throw new Error('Could not retrieve series index from KV.');
        }

        console.log(`✅ Found ${seriesIndex.length} collections.`);

        let totalProducts = 0;
        let zeroPriceCount = 0;
        let errorReport = `PRICE AUDIT REPORT - ${new Date().toLocaleString()}\n`;
        errorReport += `=================================================\n\n`;

        // 2. Iterate Collections
        for (const SERIES of seriesIndex) {
            const collectionName = typeof SERIES === 'string' ? SERIES : SERIES.id;

            // process.stdout.write(`\r🔍 Checking: ${collectionName.padEnd(30)}`);

            const products = await kv.get(`collection:${collectionName}`);

            if (!products || !Array.isArray(products)) {
                // console.log(` - ⚠️ No data found`);
                continue;
            }

            const zeroPriceItems = products.filter(p => !p.price || parseFloat(p.price) <= 0);

            totalProducts += products.length;

            if (zeroPriceItems.length > 0) {
                zeroPriceCount += zeroPriceItems.length;
                console.log(`\n❌ [${collectionName}]: Found ${zeroPriceItems.length} items with price $0`);

                errorReport += `COLLECTION: ${collectionName} (${zeroPriceItems.length}/${products.length} affected)\n`;
                zeroPriceItems.forEach(p => {
                    errorReport += `   - [${p.id}] ${p.name} (Price: ${p.price})\n`;
                });
                errorReport += `\n`;
            }
        }

        console.log(`\n\n${'='.repeat(60)}`);
        console.log(`📊 FINAL SUMMARY`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Total Products Scanned: ${totalProducts}`);
        console.log(`❌ Price Errors Found:  ${zeroPriceCount}`);

        if (zeroPriceCount > 0) {
            await fs.writeFile(REPORT_FILE, errorReport);
            console.log(`\n📄 Detailed report saved to: ${REPORT_FILE}`);
        } else {
            console.log(`\n✅ Verification Passed! No zero-price items found.`);
            // Clear old report if valid
            try { await fs.unlink(REPORT_FILE); } catch { }
        }

    } catch (e) {
        console.error('\n💀 EXECUTION ERROR:', e);
    }
}

auditPrices();
