console.log('Testing Dotenv + SFTP...');
try {
    require('dotenv').config();
    console.log('Dotenv loaded.');
    const Client = require('ssh2-sftp-client');
    console.log('SFTP success:', typeof Client);
} catch (e) {
    console.error('CRASH:', e);
}
