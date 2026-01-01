const Client = require('ssh2-sftp-client');
const fs = require('fs');
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
        const list = await sftp.list('/');

        let output = `Total Items: ${list.length}\n`;
        list.forEach(item => {
            output += `Name: "${item.name}"\n`;
            output += `Length: ${item.name.length}\n`;
            output += `Type: ${item.type}\n`;
            output += `CharCodes: ${item.name.split('').map(c => c.charCodeAt(0)).join(',')}\n`;
            output += '---\n';
        });

        fs.writeFileSync('root_debug.txt', output);
        console.log('Done writing root_debug.txt');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        sftp.end();
    }
})();
