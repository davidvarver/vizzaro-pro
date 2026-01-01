// scripts/analyze-csv-headers.js
require('dotenv').config();
const Client = require('ssh2-sftp-client');
const { parse } = require('csv-parse/sync');

const sftp = new Client();

const config = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function analyze() {
    try {
        await sftp.connect(config);
        const path = '/general_inventory/BHF_inventory.csv';
        console.log('Downloading CSV header...');

        // Get first 5KB to ensure we get headers and a few rows
        const chunk = await sftp.get(path, undefined, { readStreamOptions: { start: 0, end: 5000 } });
        const text = chunk.toString('utf8');

        // Parse
        const records = parse(text, {
            columns: true,
            skip_empty_lines: true,
            relax_quotes: true,
            to: 5 // Get first 5 rows
        });

        if (records.length > 0) {
            console.log('\n--- DETECTED COLUMNS ---');
            console.log(Object.keys(records[0]).join('\n'));

            console.log('\n--- SAMPLE ROW ---');
            console.log(records[0]);
        } else {
            console.log('No records found');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        sftp.end();
    }
}

analyze();
