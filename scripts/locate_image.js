
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

const TARGET = process.argv[2] || 'RMWS1370';

async function findFile(dir) {
    try {
        const list = await sftp.list(dir);
        for (const item of list) {
            if (item.type === 'd') {
                if (item.name === '.' || item.name === '..') continue;
                await findFile(`${dir}/${item.name}`);
            } else {
                if (item.name.includes(TARGET)) {
                    console.log(`FOUND: ${dir}/${item.name}`);
                    process.exit(0);
                }
            }
        }
    } catch (err) {
        // console.warn(`Error scanning ${dir}: ${err.message}`);
    }
}

async function main() {
    try {
        console.log(`Searching for ${TARGET}...`);
        await sftp.connect(config);

        // Optimize: Check likely paths first
        const paths = ['/New Products', '/WallpaperBooks'];

        for (const p of paths) {
            await findFile(p);
        }

        console.log('Not found.');
    } catch (err) {
        console.error(err);
    } finally {
        sftp.end();
    }
}

main();
