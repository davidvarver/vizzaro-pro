require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function verify() {
    console.log('🔍 inspecting wallpapers_catalog_hash...');
    try {
        const data = await kv.hgetall('wallpapers_catalog_hash');

        if (!data) {
            console.log('❌ Hash is empty or null.');
            return;
        }

        const keys = Object.keys(data);
        console.log(`📦 Found ${keys.length} items in hash.`);

        if (keys.length === 0) return;

        // Inspect first 3 items
        for (let i = 0; i < Math.min(3, keys.length); i++) {
            const key = keys[i];
            const value = data[key];

            console.log(`\n--- Item [${key}] ---`);
            console.log('Type of value:', typeof value);

            let parsed = value;
            if (typeof value === 'string') {
                try {
                    console.log('Value starts with:', value.substring(0, 50));
                    parsed = JSON.parse(value);
                    console.log('✅ JSON Parse successful.');
                } catch (e) {
                    console.log('⚠️ JSON Parse failed (might be plain string or [object Object]).');
                }
            } else {
                console.log('Value is ALREADY an object (Client auto-parsed).');
            }

            if (typeof parsed === 'object') {
                console.log('ID:', parsed.id);
                console.log('Name:', parsed.name);
                console.log('Image:', parsed.imageUrl);
                console.log('Images (Array):', parsed.imageUrls);
                console.log('Collection:', parsed.collection);
            } else {
                console.log('❌ Value is NOT an object after processing:', parsed);
            }
        }

    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

verify();
