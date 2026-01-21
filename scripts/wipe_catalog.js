require('dotenv').config();
const { createClient } = require('@vercel/kv');
const fs = require('fs').promises;
const path = require('path');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🗑️  STARTING FULL CATALOG WIPE (KV + Local)...');

    // 1. Delete Local Checkpoints
    console.log('\n1️⃣  Deleting local checkpoints...');
    const checkpoints = ['sync_progress.json', 'checkpoint.json'];
    for (const file of checkpoints) {
        try {
            const filePath = path.resolve(__dirname, '..', file);
            await fs.unlink(filePath);
            console.log(`   ✅ Deleted local file: ${file}`);
        } catch (e) {
            if (e.code !== 'ENOENT') {
                console.log(`   ⚠️ Error deleting ${file}:`, e.message);
            }
        }
    }

    // 2. Delete Main Hash & Indices
    console.log('\n2️⃣  Deleting KV Indexes...');
    try {
        await kv.del('wallpapers_catalog_hash');
        await kv.del('wallpapers_series_index'); // Home Page Index
        console.log('   ✅ Deleted wallpapers_catalog_hash & wallpapers_series_index');
    } catch (e) {
        console.log('   ⚠️ Error deleting hash:', e.message);
    }

    // 3. Delete All Collection Keys
    console.log('\n3️⃣  Deleting Collection Keys...');
    let cursor = 0;
    let deletedCount = 0;

    do {
        const result = await kv.scan(cursor, { match: 'collection:*', count: 100 });
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
            await kv.del(...keys);
            deletedCount += keys.length;
            // process.stdout.write(`   Deleted ${deletedCount} collection keys...\r`);
            console.log(`   Deleted batch of ${keys.length} keys...`);
        }
    } while (cursor !== 0 && cursor !== '0');

    console.log(`\n🎉 FULL WIPE COMPLETE! (${deletedCount} collections removed)`);
    console.log('   The system is 100% clean.');
    console.log('   To rebuild: node scripts/sync_catalog.js --reset');
}

main();
