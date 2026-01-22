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
    const path = '/WallpaperBooks';
    console.log('📂 Listing root directory...');
    const list = await sftp.list(path);
    const directories = list.filter(f => f.type === 'd');

    console.log(`✅ TOTAL COLLECTIONS DETECTED: ${directories.length}`);
    console.log('-----------------------------------');
    sftp.end();
}
main();
