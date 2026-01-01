// scripts/peek-ftp-data.js
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function peek() {
    try {
        await sftp.connect(config);
        console.log('Connected!');

        // 1. Peek CSV
        const csvPath = '/general_inventory/BHF_inventory.csv';
        console.log(`\nReading first 500 bytes of ${csvPath}...`);
        const buffer = await sftp.get(csvPath, undefined, { readStreamOptions: { start: 0, end: 500 } });
        console.log('--- CSV HEADERS ---');
        console.log(buffer.toString());

        // 2. Peek Images
        // Trying 'New Products/All Images' as it sounds like a flat list which is easier to map
        const imgDir = '/New Products/All Images';
        console.log(`\nListing 10 images from ${imgDir}...`);
        const imgs = await sftp.list(imgDir);
        imgs.slice(0, 10).forEach(f => console.log(f.name));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        sftp.end();
    }
}

peek();
