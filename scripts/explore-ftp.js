const Client = require('ssh2-sftp-client');
const fs = require('fs');
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
        console.log('Connected! Listing root...');

        const list1 = await sftp.list('/New Products');
        const list2 = await sftp.list('/WallpaperBooks/1 All Wallpaper Images');
        const list = [...list1, ...list2];
        console.log(`Found ${list.length} items.`);

        // Sort: Directories first
        list.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'd' ? -1 : 1;
        });

        // Write to file to avoid encoding issues
        fs.writeFileSync('ftp_dir.json', JSON.stringify(list, null, 2));
        console.log('Successfully saved to ftp_dir.json');

    } catch (err) {
        console.error('SFTP Error:', err.message);
    } finally {
        sftp.end();
    }
}

explore();
