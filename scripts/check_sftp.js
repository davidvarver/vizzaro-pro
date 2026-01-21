try {
    console.log('Requiring ssh2-sftp-client...');
    const Client = require('ssh2-sftp-client');
    console.log('Success! Client:', typeof Client);
    const sftp = new Client();
    console.log('Instance created.');
} catch (e) {
    console.error('FAIL:', e);
}
