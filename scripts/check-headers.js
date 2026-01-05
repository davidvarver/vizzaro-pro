
require('dotenv').config();
const Client = require('ssh2-sftp-client');
const XLSX = require('xlsx');

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
};

const EXCEL_FILE = 'All_NewProduct_Data.xlsx';

async function main() {
    const sftp = new Client();
    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        // Download Excel
        console.log(`⬇️ Downloading ${EXCEL_FILE}...`);
        const excelBuffer = await sftp.get(`/New Products/All Data/${EXCEL_FILE}`);
        console.log('✅ Downloaded.');

        const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert to JSON to get headers
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // header:1 returns array of arrays

        if (data.length > 0) {
            const headers = data[0];
            console.log('\n📋 AVAILABLE COLUMNS:');
            console.log('---------------------');
            headers.forEach((h, i) => console.log(`${i + 1}. ${h}`));
            console.log('---------------------\n');

            // Check for Repeat keywords
            const repeatCols = headers.filter(h =>
                String(h).toLowerCase().includes('repeat') ||
                String(h).toLowerCase().includes('match')
            );

            if (repeatCols.length > 0) {
                console.log('✨ POTENTIAL REPEAT COLUMNS FOUND:');
                console.log(repeatCols);
            } else {
                console.log('❌ No explicit "Repeat" or "Match" columns found.');
            }
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sftp.end();
    }
}

main();
