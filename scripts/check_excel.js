require('dotenv').config();
const Client = require('ssh2-sftp-client');

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
    readyTimeout: 20000,
    keepalive: 10000
};

const TARGET_NAME = process.argv[2] || 'Advantage Bath';

async function main() {
    const sftp = new Client();
    await sftp.connect(FTP_CONFIG);

    // Find folder
    let rootPath = `/WallpaperBooks/${TARGET_NAME}`;
    if (!await sftp.exists(rootPath)) {
        const books = await sftp.list('/WallpaperBooks');
        const match = books.find(b => b.name.includes(TARGET_NAME));
        if (match) rootPath = `/WallpaperBooks/${match.name}`;
    }

    console.log('Checking folder:', rootPath);
    if (await sftp.exists(rootPath)) {
        const list = await sftp.list(rootPath);
        const excels = list.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.csv'));
        console.log('Found Data Files:', excels.map(f => f.name));
    } else {
        console.log('Folder not found');
    }
    sftp.end();
}
main();
