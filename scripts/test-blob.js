// scripts/test-blob.js
// Run this with: node scripts/test-blob.js
// Ensure BLOB_READ_WRITE_TOKEN is set in your environment or .env file

import { put } from "@vercel/blob";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testUpload() {
    console.log('Testing Vercel Blob Upload...');
    console.log('Token present:', !!process.env.BLOB_READ_WRITE_TOKEN);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('ERROR: BLOB_READ_WRITE_TOKEN is missing.');
        console.log('Please get the token from your Vercel Dashboard (Storage section) and add it to your .env file.');
        process.exit(1);
    }

    try {
        const { url } = await put('test/hello-world.txt', 'Hello Vizzaro World! This is a test file.', {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log('✅ Upload Successful!');
        console.log('File URL:', url);
    } catch (error) {
        console.error('❌ Upload Failed:', error);
    }
}

testUpload();
