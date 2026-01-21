require('dotenv').config();
const { put } = require('@vercel/blob');

async function main() {
    console.log('Testing Blob Upload...');
    console.log('Token length:', process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.length : 0);

    try {
        const blob = await put('test-upload.txt', 'Hello World', {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });
        console.log('✅ Success:', blob.url);
    } catch (e) {
        console.error('❌ Error:', e);
    }
}
main();
