require('dotenv').config();
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
};

async function checkVariants() {
    try {
        await sftp.connect(FTP_CONFIG);
        // List files that start with specific patterns to see if there are variants like _1.jpg, _ROOM.jpg etc
        const list = await sftp.list('/New Products/All Images'); // Filter is client side usually for sftp lib or regex

        // Let's filter for a specific SKU we know exists: FPS6279
        const variants = list.filter(f => f.name.includes('FPS6279'));

        console.log('--- File Variants for FPS6279 ---');
        variants.forEach(f => console.log(f.name));

        // Check another one just in case
        const variants2 = list.slice(0, 20).map(f => f.name);
        console.log('--- First 20 files ---');
        console.log(variants2);

        await sftp.end();
    } catch (err) {
        console.error(err);
    }
}
checkVariants();
