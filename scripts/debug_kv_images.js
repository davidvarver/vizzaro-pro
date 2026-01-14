require('dotenv').config();
const { createClient } = require('@vercel/kv');
const fs = require('fs');

async function checkKv() {
    console.log('🔍 Connecting to KV...');
    const kv = createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });

    const targetId = 'HN002601'; // Brewster Kids item
    const targetId2 = 'FPS6281'; // Item from log
    console.log(`🔍 Checking KV for ${targetId} and ${targetId2}...`);

    try {
        const catalog = await kv.get('wallpapers_catalog');
        if (!catalog) {
            console.log('❌ Catalog not found');
            return;
        }

        const item1 = catalog.find(i => i.id === targetId || i.id === targetId.split('-')[1]);
        const item2 = catalog.find(i => i.id === targetId2);

        let output = '';

        output += '--- HN002601 (Target) ---\n';
        if (item1) {
            output += `Name: ${item1.name}\n`;
            output += `ImageUrl: "${item1.imageUrl || ''}"\n`;
            output += `ImageUrls: ${JSON.stringify(item1.imageUrls || [])}\n`;
        } else {
            output += 'NOT FOUND\n';
        }

        output += '\n--- FPS6281 (Control) ---\n';
        if (item2) {
            output += `Name: ${item2.name}\n`;
            output += `ImageUrl: "${item2.imageUrl || ''}"\n`;
            output += `ImageUrls: ${JSON.stringify(item2.imageUrls || [])}\n`;
        } else {
            output += 'NOT FOUND\n';
        }

        fs.writeFileSync('scripts/kv_status.txt', output);
        console.log('✅ Wrote to scripts/kv_status.txt');

    } catch (e) {
        console.error(e);
    }
}

checkKv();
