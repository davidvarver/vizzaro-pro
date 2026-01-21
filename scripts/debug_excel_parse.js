require('dotenv').config();
const Client = require('ssh2-sftp-client');
const XLSX = require('xlsx');

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function main() {
    const sftp = new Client();
    await sftp.connect(FTP_CONFIG);
    const path = '/WallpaperBooks/A-Street Select - 4021';

    console.log(`📂 Listing: ${path}`);
    const list = await sftp.list(path);
    const excelFile = list.find(f => f.name.endsWith('.xlsx'));

    if (!excelFile) {
        console.log('❌ No Excel file found in root!');
        sftp.end();
        return;
    }

    console.log(`✅ Found file: ${excelFile.name}`);
    console.log(`⬇️ Downloading...`);

    const buffer = await sftp.get(`${path}/${excelFile.name}`);
    console.log(`📦 Downloaded ${buffer.length} bytes.`);

    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        console.log(`📑 Sheet Name: ${sheetName}`);

        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        console.log(`✅ Parsed ${json.length} rows.`);
        if (json.length > 0) {
            const keys = Object.keys(json[0]);
            console.log('🔑 ALL KEYS:', keys.join(' | '));
            console.log('SAMPLE ROW:', JSON.stringify(json[0]));
        }
    } catch (e) {
        console.error('❌ Error parsing Excel:', e);
    }

    sftp.end();
}
main();
