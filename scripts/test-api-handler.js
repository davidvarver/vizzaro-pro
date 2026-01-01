// scripts/test-api-handler.js
require('dotenv').config();
const handler = require('../api/catalog/get.js').default;

const req = {
    method: 'GET',
    headers: {}
};

const res = {
    setHeader: (k, v) => console.log(`[Header] ${k}: ${v}`),
    status: (code) => ({
        json: (data) => console.log(`[Status ${code}] JSON:`, JSON.stringify(data, null, 2).substring(0, 500) + '...'),
        end: () => console.log(`[Status ${code}] End`),
    })
};

console.log('Testing /api/catalog/get handler with current .env...');
handler(req, res).catch(err => console.error('Handler threw:', err));
