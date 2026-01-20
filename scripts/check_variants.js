
require('dotenv').config();
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
};

const IMAGE_DIRS = [
    '/New Products/All Images',
    '/WallpaperBooks/1 All Wallpaper Images/Images',
    '/WallpaperBooks/Brewster Kids - 2886'
];

// Target pattern to search for
const TARGET_PATTERN = '2904-24005';

async function main() {
    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        for (const dir of IMAGE_DIRS) {
            console.log(`\n📂 Listing ${dir}...`);
            try {
                const items = await sftp.list(dir);
                const matches = items.filter(item => item.name.includes(TARGET_PATTERN));

                if (matches.length > 0) {
                    console.log(`   🎯 Found ${matches.length} matches in ${dir}:`);
                    matches.forEach(m => console.log(`      - ${m.name}`));
                } else {
                    console.log(`   ❌ No matches for "${TARGET_PATTERN}"`);
                }
            } catch (e) {
                console.warn(`   ⚠️ Error listing ${dir}: ${e.message}`);
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        sftp.end();
    }
}

main();
