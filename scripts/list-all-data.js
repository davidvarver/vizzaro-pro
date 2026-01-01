// scripts/list-all-data.js
require('dotenv').config();
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function list() {
    try {
        await sftp.connect(config);
        const path = '/New Products/All Data';
        console.log(`Listing ${path}...`);

        const list = await sftp.list(path);

        console.log(`Found ${list.length} items.`);
        // Log first 20 items
        list.slice(0, 20).forEach(item => {
            console.log(`[${item.type}] ${item.name} \t (${item.size})`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        sftp.end();
    }
}

list();
