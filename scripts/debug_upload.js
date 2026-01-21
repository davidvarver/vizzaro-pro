require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function main() {
    console.log('🐞 Debugging Single Upload...');
    const sftp = new Client();

    try {
        await sftp.connect(FTP_CONFIG);
        console.log('✅ FTP Connected');

        // Path known to exist from logs
        const remotePath = '/WallpaperBooks/Advantage Bath/2814-MKE-3129.jpg';

        console.log(`⬇️ Downloading ${remotePath}...`);
        const buffer = await sftp.get(remotePath);
        console.log(`📦 Got Buffer: ${buffer.length} bytes`);

        console.log('⬆️ Uploading to Blob...');
        const blob = await put('debug/Advantage_Bath/2814-MKE-3129.jpg', buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log('✅ Upload Success:', blob.url);

    } catch (e) {
        console.error('❌ FAILURE:', e);
        if (e.cause) console.error('   Cause:', e.cause);
    } finally {
        sftp.end();
    }
}

main();
