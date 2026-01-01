const Client = require('ssh2-sftp-client');
const sftp = new Client();
const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22
};

(async () => {
    try {
        await sftp.connect(config);
        console.log('Connected. Listing "/New Products/All Data"...');
        const list = await sftp.list('/New Products/All Data');

        list.forEach(item => {
            console.log(`[${item.type}] ${item.name}`);
        });

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        sftp.end();
    }
})();
