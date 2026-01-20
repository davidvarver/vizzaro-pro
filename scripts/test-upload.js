require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { put } = require('@vercel/blob');

const sftp = new Client();

const FTP_CONFIG = {
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT || 22,
    username: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
};

async function main() {
    try {
        console.log('🔌 Connecting to FTP...');
        await sftp.connect(FTP_CONFIG);

        const remotePath = '/WallpaperBooks/Advantage Bali - 2814/Images/2814-467307.jpg';
        console.log(`📥 Downloading ${remotePath}...`);

        try {
            const buf = await sftp.get(remotePath);
            console.log(`✅ Downloaded ${buf.length} bytes.`);

            console.log('☁️ Uploading to Vercel Blob...');
            const blob = await put('products/test-upload.jpg', buf, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
                contentType: 'image/jpeg',
                allowOverwrite: true,
                addRandomSuffix: false
            });

            console.log('✅ Upload Success!');
            console.log('URL:', blob.url);

        } catch (e) {
            console.error('❌ Failed to download/upload:', e.message);
        }

    } catch (err) {
        console.error('❌ Connection Error:', err);
    } finally {
        sftp.end();
    }
}

main();
