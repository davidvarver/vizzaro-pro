require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');
const { createClient } = require('@vercel/kv');
const path = require('path');
const XLSX = require('xlsx');

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

function cleanPrice(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace('$', '').replace(',', '')) || 0;
}

function inchToMeter(val) {
    const v = parseFloat(val);
    if (isNaN(v)) return 0;
    return parseFloat((v * 0.0254).toFixed(3));
}

async function itemsFindFirst(files, searchNames) {
    for (const name of searchNames) {
        const found = files.find(f => f.name.toLowerCase() === name.toLowerCase());
        if (found) return found.name;
    }
    return null;
}

async function main() {
    try {
        console.log('🔌 Connecting...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        // Target: Advantage Concrete
        const dirPath = '/WallpaperBooks/Advantage Concrete - 4096';
        console.log(`📂 Scanning: ${dirPath}`);

        let allItems = await sftp.list(dirPath);
        let filesInFolder = allItems;

        // Subfolder check
        const hasImages = allItems.some(f => f.name.toLowerCase().endsWith('.jpg'));
        const imagesSubfolder = allItems.find(f => f.name.toLowerCase() === 'images' && f.type === 'd');

        if (!hasImages && imagesSubfolder) {
            console.log(`    📂 Switching to scan subfolder: ${dirPath}/Images`);
            const subPath = `${dirPath}/${imagesSubfolder.name}`;
            const subFiles = await sftp.list(subPath);
            filesInFolder = subFiles;
            // NOTE: For downloading images, we need to know they are in subPath.
            // But sftp.get needs full path.
            // In the original script we updated dirPath. Let's do that here.
            // dirPath = subPath; // We can't reassign const.
        }

        const xlsxFile = allItems.find(f => f.name.endsWith('.xlsx'));
        if (!xlsxFile) {
            console.error('❌ No Excel found!');
            return;
        }

        console.log(`   Processing Excel: ${xlsxFile.name}`);
        const buf = await sftp.get(`${dirPath}/${xlsxFile.name}`);
        const workbook = XLSX.read(buf, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`   Found ${rows.length} rows.`);

        let savedCount = 0;
        for (const row of rows) {
            let pattern = String(row['Pattern']);

            // Find Image in filesInFolder
            const barePattern = pattern.includes('-') ? pattern.split('-')[1] : pattern;
            const candidates = [`${pattern}.jpg`, `${pattern}.jpeg`, `${pattern}.png`, `MD${pattern}.jpg`,
            `${barePattern}.jpg`, `${barePattern}.jpeg`];

            const imgName = itemsFindFirst(filesInFolder, candidates);

            if (imgName) {
                console.log(`   📸 Found image: ${imgName} for ${pattern}`);

                // Get Image content involves checking where it really is.
                // If we switched folders, filesInFolder has the items, but we need the path.
                let imagePath = `${dirPath}/${imgName}`;
                if (imagesSubfolder && !hasImages) {
                    imagePath = `${dirPath}/Images/${imgName}`;
                }

                const imgBuf = await sftp.get(imagePath);

                const blob = await put(`products/Concrete/${imgName}`, imgBuf, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                    allowOverwrite: true,
                    contentType: 'image/jpeg'
                });

                // Save to DB
                const item = {
                    id: pattern,
                    name: row['Name'],
                    collection: 'Advantage Concrete', // Force it
                    imageUrl: blob.url,
                    timestamp: Date.now()
                };

                await kv.hset('wallpapers_catalog_hash', { [item.id]: item });
                savedCount++;
                process.stdout.write('+');
            } else {
                process.stdout.write('.');
            }
        }
        console.log(`\n✅ Saved ${savedCount} items.`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        sftp.end();
    }
}
main();
