// scripts/test-kv.js
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function testKV() {
    console.log('Testing KV Connection...');
    console.log('URL:', process.env.KV_REST_API_URL);

    try {
        await kv.set('test_key', 'hello_kv');
        const val = await kv.get('test_key');
        console.log('✅ KV Connected! Value:', val);
    } catch (e) {
        console.error('❌ KV Error:', e);
    }
}

testKV();
