// scripts/peek-csv.js
const Client = require('ssh2-sftp-client');
const sftp = new Client();

const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function peek() {
    try {
        await sftp.connect(config);
        const path = '/general_inventory/BHF_inventory.csv';
        const buffer = await sftp.get(path); // Download whole file (1.2MB is small enough)

        // Parse first 2 lines
        const text = buffer.toString('utf8');
        const lines = text.split('\n').slice(0, 3);

        console.log('--- CSV CONTENT ---');
        lines.forEach(line => console.log(line));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        sftp.end();
    }
}

peek();
