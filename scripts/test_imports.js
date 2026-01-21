try {
    console.log('1. Dotenv');
    require('dotenv').config();
    console.log('2. KV');
    const { createClient } = require('@vercel/kv');
    console.log('3. Blob');
    const { put } = require('@vercel/blob');
    console.log('4. SFTP');
    const SftpClient = require('ssh2-sftp-client');
    console.log('5. Path');
    const path = require('path');
    console.log('✅ ALL IMPORTS OK');
} catch (e) {
    console.error('❌ CRASH:', e);
}
