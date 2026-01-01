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
        console.log('Connected. Listing "/All Data New"...');
        const list = await sftp.list('/All Data New');
        list.forEach(i => console.log(`[${i.type}] ${i.name}`));
    } catch (e) {
        console.error('Error listing /All Data New:', e.message);
        try {
            console.log('Trying relative "All Data New"...');
            const list = await sftp.list('All Data New');
            list.forEach(i => console.log(`[${i.type}] ${i.name}`));
        } catch (e2) {
            console.error('Error listing relative:', e2.message);
        }
    } finally {
        sftp.end();
    }
})();
