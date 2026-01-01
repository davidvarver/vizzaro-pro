// scripts/debug-env.js
require('dotenv').config();

console.log('--- ENV DEBUG ---');
const url = process.env.KV_REST_API_URL;
console.log('KV_REST_API_URL exists:', !!url);
if (url) {
    console.log('KV_REST_API_URL length:', url.length);
    console.log('KV_REST_API_URL start:', url.substring(0, 10));
    console.log('KV_REST_API_URL end:', url.substring(url.length - 10));
    console.log('Full Value (Safe):', url.replace(/:\/\/.+@/, '://***@')); // Hide creds if any
    console.log('Raw Value:', url);
}

const token = process.env.KV_REST_API_TOKEN;
console.log('KV_REST_API_TOKEN exists:', !!token);

const redisUrl = process.env.REDIS_URL;
console.log('REDIS_URL exists:', !!redisUrl);
if (redisUrl) {
    console.log('REDIS_URL Safe:', redisUrl.replace(/:\/\/.+@/, '://***@'));
    console.log('REDIS_URL Raw:', redisUrl);
}
