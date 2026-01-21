require('dotenv').config();
const Client = require('ssh2-sftp-client');

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
    const list = await sftp.list(path);
    const excelFiles = list.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'));

    if (excelFiles.length > 0) {
        console.log('✅ FOUND EXCEL FILES:', JSON.stringify(excelFiles, null, 2));
    } else {
        console.log('❌ NO EXCEL FILES FOUND in this folder.');
        console.log('   All files:', list.map(f => f.name).join(', '));
    }
    sftp.end();
}
main();
