
const XLSX = require('xlsx');

// Load the file
const FILE = './GW Products 1010262.xlsx';

try {
    console.log(`Reading ${FILE}...`);
    const workbook = XLSX.readFile(FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Checking ${data.length} rows for Repeat="YES" or similar...\n`);

    // Find first 3 rows where Vertical Repeat or Repeat contains "YES" (case insensitive)
    const yesRows = data.filter(row => {
        const vRep = String(row['Vertical Repeat'] || '').toUpperCase();
        const rep = String(row['Repeat'] || '').toUpperCase();
        return vRep.includes('YES') || rep.includes('YES');
    });

    if (yesRows.length > 0) {
        console.log(`Found ${yesRows.length} rows with YES repeat.`);
        console.log('--- EXAMPLE ROW WITH "YES" ---');
        console.log(JSON.stringify(yesRows[0], null, 2));
    } else {
        console.log('No rows found with "YES" in repeat columns.');

        // Print all headers just in case we missed one
        if (data.length > 0) {
            console.log('\n--- AVAILABLE HEADERS ---');
            console.log(Object.keys(data[0]).join(', '));
        }
    }

} catch (e) {
    console.error('Error:', e.message);
}
