require('dotenv').config();
const Client = require('ssh2-sftp-client');
const XLSX = require('xlsx');

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22
};

const TARGET_COLLECTION = 'Advantage Bath';

async function main() {
    const sftp = new Client();
    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected');

        // Find folder
        const books = await sftp.list('/WallpaperBooks');
        const folder = books.find(b => b.name.includes(TARGET_COLLECTION));

        if (!folder) {
            console.error('❌ Collection folder not found');
            return;
        }

        const path = `/WallpaperBooks/${folder.name}`;
        console.log(`📂 Scanning ${path}...`);

        const files = await sftp.list(path);
        const excel = files.find(f => f.name.match(/\.xlsx?$/i));

        if (!excel) {
            console.error('❌ No Excel file found');
            return;
        }

        console.log(`📊 Reading ${excel.name}...`);
        const buffer = await sftp.get(`${path}/${excel.name}`);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const fs = require('fs');
        if (data.length > 0) {
            console.log('--- WRITING SAMPLE DATA TO FILE ---');
            const sample = data.slice(0, 5).map(row => ({
                id: row.Pattern,
                name: row.Name,
                desc: row.Description,
                prodName: row['Product Name']
            }));
            fs.writeFileSync('sample_data.json', JSON.stringify(sample, null, 2));
            console.log('--- DONE ---');
        } else {
            console.log('⚠️ Excel is empty');
        }

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        sftp.end();
    }
}

main();
