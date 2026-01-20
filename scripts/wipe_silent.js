require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function main() {
    console.log('🗑️  Silently Wiping Catalog...');
    await kv.del('wallpapers_catalog');
    await kv.del('wallpapers_catalog_hash');
    console.log('✅  Database Wiped.');
    process.exit(0);
}
main();
