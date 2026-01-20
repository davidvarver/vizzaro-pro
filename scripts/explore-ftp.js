require('dotenv').config();
const Client = require('ssh2-sftp-client');
const fs = require('fs');

const sftp = new Client();

const FTP_CONFIG = {
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT || 22,
    username: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    // Add debug if needed
};

async function main() {
    try {
        console.log('🔌 Connecting to SFTP...');
        await sftp.connect(FTP_CONFIG);
        console.log('✅ Connected.');

        // Target Folder from logs
        const targetPath = '/WallpaperBooks/A-Street Select - 4021/Advantage Bali/Images';
        // Check if 72dpi exists

        console.log(`📂 Listing ${targetPath}...`);

        try {
            const list = await sftp.list(targetPath);
            console.log(`✅ Found ${list.length} items.`);
            fs.writeFileSync('ftp_listing_bali.json', JSON.stringify(list, null, 2));
            console.log('💾 Saved to ftp_listing_bali.json');
        } catch (e) {
            console.warn(`⚠️ Could not list ${targetDir}: ${e.message}`);

            // Try parent
            const parentDir = '/WallpaperBooks/Advantage Bali - 2814';
            console.log(`📂 Trying parent: ${parentDir}...`);
            const list2 = await sftp.list(parentDir);
            console.log(`✅ Found ${list2.length} items.`);
            fs.writeFileSync('ftp_listing_bali.json', JSON.stringify(list2, null, 2));
        }

    } catch (err) {
        console.error('❌ Fatal Error:', err);
    } finally {
        sftp.end();
    }
}

main();
