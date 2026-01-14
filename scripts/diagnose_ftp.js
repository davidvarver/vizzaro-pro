require('dotenv').config();
const Client = require('ssh2-sftp-client');

async function checkFtp() {
    const sftp = new Client();
    const config = {
        host: 'ftpimages.brewsterhomefashions.com',
        username: 'dealers',
        password: 'Brewster#1',
    };

    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(config);

        const targetDir = '/WallpaperBooks/Brewster Kids - 2886';
        console.log(`📂 Listing ${targetDir} ...`);

        const list = await sftp.list(targetDir);
        console.log(`   Total items: ${list.length}`);

        const sample = list.slice(0, 20).map(f => f.name).join('\n');
        console.log('Sample files:');
        console.log(sample);

        // Search for HN002601
        const match = list.find(f => f.name.includes('HN002601'));
        if (match) {
            console.log(`\n✅ FOUND TARGET IMAGE: ${match.name}`);
        } else {
            console.log('\n❌ Target image HN002601 not found in this folder.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        sftp.end();
    }
}

checkFtp();
