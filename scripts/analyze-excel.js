// scripts/analyze-excel.js
require('dotenv').config();
const Client = require('ssh2-sftp-client');
const XLSX = require('xlsx');

const sftp = new Client();

const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function analyze() {
    try {
        await sftp.connect(config);
        const path = '/New Products/All Data/All_NewProduct_Data.xlsx';
        console.log(`Downloading ${path}...`);

        // Download to buffer
        const buffer = await sftp.get(path);

        console.log('Parsing Excel...');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Get headers
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length > 0) {
            console.log('\n--- EXCEL HEADERS ---');
            console.log(json[0].join(', '));

            console.log('\n--- SAMPLE ROW ---');
            console.log(json[1]);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        sftp.end();
    }
}

analyze();
