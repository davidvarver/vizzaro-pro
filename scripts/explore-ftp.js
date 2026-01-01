// scripts/explore-ftp.js
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function explore() {
    try {
        console.log(`Connecting to ${config.host}...`);
        await sftp.connect(config);
        console.log('Connected!');

        console.log('Listing root directory...');
        const list = await sftp.list('/');

        console.log('\n--- ROOT DIRECTORY ---');
        list.forEach(item => {
            console.log(`[${item.type}] ${item.name} \t (${formatSize(item.size)})`);
        });

        const subDirs = ['All Data New', 'All Images'];

        for (const dir of subDirs) {
            try {
                console.log(`\n--- Listing ${dir} (First 20 items) ---`);
                const subList = await sftp.list(dir);
                subList.slice(0, 20).forEach(item => {
                    console.log(`[${item.type}] ${item.name} \t (${formatSize(item.size)})`);
                });
            } catch (e) {
                console.log(`Could not list ${dir}: ${e.message}`);
            }
        }

    } catch (err) {
        console.error('SFTP Error:', err.message);
    } finally {
        sftp.end();
    }
}

explore();
