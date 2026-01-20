require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const XLSX = require('xlsx');
const path = require('path');

const sftp = new Client();
const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const FTP_CONFIG = {
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT || 22,
    username: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
};

async function itemsFindFirst(files, searchNames) {
    for (const name of searchNames) {
        const found = files.find(f => f.name.toLowerCase() === name.toLowerCase());
        if (found) return found.name;
    }
    return null;
}

async function cleanPrice(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace('$', '').replace(',', '')) || 0;
}

function inchToMeter(val) {
    const v = parseFloat(val);
    if (isNaN(v)) return 0;
    return parseFloat((v * 0.0254).toFixed(3));
}

// SIMPLIFIED LOGIC:
// 1. Iterate known root folders (WallpaperBooks, New Products)
// 2. For each subfolder:
//    - Look for .xlsx
//    - Look for images in ROOT only (no subfolder diving)
//    - Save to Hash
async function main() {
    try {
        console.log('🚀 Starting SIMPLE Import (V2)...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        const ROOTS = ['/WallpaperBooks', '/New Products'];

        for (const root of ROOTS) {
            console.log(`📂 Scanning Root: ${root}`);
            const folders = await sftp.list(root);

            for (const folder of folders) {
                if (folder.type !== 'd') continue;

                const dirPath = `${root}/${folder.name}`;
                try {
                    const items = await sftp.list(dirPath);
                    const excel = items.find(f => f.name.endsWith('.xlsx'));

                    if (!excel) {
                        // console.log(`   Running past ${folder.name} (No Excel)`);
                        continue;
                    }

                    console.log(`   📘 Processing: ${folder.name}`);

                    // Download Excel
                    const buf = await sftp.get(`${dirPath}/${excel.name}`);
                    const workbook = XLSX.read(buf, { type: 'buffer' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet);

                    let savedCount = 0;
                    for (const row of rows) {
                        let pattern = String(row['Pattern']);
                        const barePattern = pattern.includes('-') ? pattern.split('-')[1] : pattern;

                        // Simple Candidates (Current Folder Only)
                        const candidates = [
                            `${pattern}.jpg`, `${pattern}.jpeg`,
                            `MD${pattern}.jpg`, `${barePattern}.jpg`
                        ];

                        const imgName = await itemsFindFirst(items, candidates);
                        let imageUrl = '';

                        if (imgName) {
                            // Upload
                            try {
                                const imgBuf = await sftp.get(`${dirPath}/${imgName}`);
                                const blob = await put(`products/simple/${imgName}`, imgBuf, {
                                    access: 'public',
                                    token: process.env.BLOB_READ_WRITE_TOKEN,
                                    allowOverwrite: true,
                                });
                                imageUrl = blob.url;
                                process.stdout.write('+');
                            } catch (e) {
                                process.stdout.write('x');
                            }
                        } else {
                            process.stdout.write('.');
                        }

                        // Save to DB
                        const product = {
                            id: pattern,
                            name: row['Name'],
                            collection: folder.name,
                            description: row['Description'] || '',
                            price: cleanPrice(row['MSRP']),
                            imageUrl: imageUrl,
                            timestamp: Date.now()
                        };

                        await kv.hset('wallpapers_catalog_hash', { [product.id]: product });
                        savedCount++;
                    }
                    console.log(`\n    ✅ Saved ${savedCount} items.`);

                } catch (err) {
                    console.error(`    ⚠️ Error in ${folder.name}: ${err.message}`);
                }
            }
        }

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        sftp.end();
    }
}

main();
