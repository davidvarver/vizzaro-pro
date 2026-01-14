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

        const targetDir = '/WallpaperBooks/1 All Wallpaper Images/Images';
        console.log(`📂 Listing ${targetDir} ...`);

        try {
            const list = await sftp.list(targetDir);
            console.log(`   Total items: ${list.length}`);

            // Search for SKU HN002601
            const target = 'HN002601';
            const match = list.find(f => f.name.includes(target));

            if (match) {
                console.log(`\n🎉 FOUND IT! ${match.name}`);
                console.log(`   Path: ${targetDir}/${match.name}`);
            } else {
                console.log(`\n❌ Not found in ${targetDir}`);
                // Partial check
                const partial = list.filter(f => f.name.includes('HN') && f.name.includes('2601'));
                if (partial.length > 0) {
                    console.log('   Partial matches:', partial.map(f => f.name));
                }
            }

        } catch (e) {
            console.log(`   ❌ Error listing subfolder: ${e.message}`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        sftp.end();
    }
}

checkFtp();
