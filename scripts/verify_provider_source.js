
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@vercel/kv');

const CONFIG = {
    EXCEL_FILE: './GW Products 1010262.xlsx',
};

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function verify() {
    console.log('🕵️ VERIFYING PROVIDER SOURCES...\n');

    // 1. Load Gimmersta Excel
    console.log(`📊 Reading Excel: ${CONFIG.EXCEL_FILE}`);
    const workbook = XLSX.readFile(CONFIG.EXCEL_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    // Extract unique collection names from Excel
    const gimmerstaCollections = new Set();
    rawData.forEach(row => {
        if (row['Collection Name']) {
            gimmerstaCollections.add(String(row['Collection Name']).trim());
        }
    });

    console.log(`✅ Loaded ${gimmerstaCollections.size} valid Gimmersta collections from Excel.`);

    // 2. Get Missing Collections from KV
    const seriesIndex = await kv.get('wallpapers_series_index');
    const ghosts = seriesIndex.filter(c => !c.thumbnail);

    const verifiedGimmersta = [];
    const likelyYork = [];

    // 3. Check each ghost
    for (const ghost of ghosts) {
        // Simple check: Is the exact name in the Set?
        // Or partial match (Excel names might have slight diffs)
        const name = ghost.id;

        // Direct lookup
        if (gimmerstaCollections.has(name)) {
            verifiedGimmersta.push(name);
        } else {
            // Try Case insensitive
            const match = [...gimmerstaCollections].find(c => c.toLowerCase() === name.toLowerCase());
            if (match) {
                verifiedGimmersta.push(name);
            } else {
                likelyYork.push(name);
            }
        }
    }

    // 4. Report
    console.log('\n🔵 CONFIRMED GIMMERSTA (Found in Excel):');
    console.log(`Total: ${verifiedGimmersta.length}`);
    verifiedGimmersta.sort().forEach(c => console.log(`   - ${c}`));

    console.log('\n🔴 PROBABLY YORK (Not in Gimmersta Excel):');
    console.log(`Total: ${likelyYork.length}`);
    likelyYork.sort().forEach(c => console.log(`   - ${c}`));

}

verify();
