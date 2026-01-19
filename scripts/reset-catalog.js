require('dotenv').config();
const { createClient } = require('@vercel/kv');
const readline = require('readline');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('⚠️  WARNING: THIS WILL DELETE ALL WALLPAPER DATA FROM THE DATABASE ⚠️');
console.log('This includes:');
console.log('1. The Legacy List (wallpapers_catalog)');
console.log('2. The New Hash (wallpapers_catalog_hash)');
console.log('\nThe website will show EMPTY until you run the import script again.');

rl.question('Are you sure you want to proceed? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes') {
        try {
            console.log('🗑️  Deleting Legacy Catalog...');
            await kv.del('wallpapers_catalog');

            console.log('🗑️  Deleting New Hash Catalog...');
            await kv.del('wallpapers_catalog_hash');

            console.log('✅ Database Wiped. Ready for fresh import.');
        } catch (e) {
            console.error('❌ Error:', e);
        }
    } else {
        console.log('❌ Cancelled.');
    }
    rl.close();
    process.exit(0);
});
