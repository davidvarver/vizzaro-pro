
const XLSX = require('xlsx');

const FILE = './GW Products 1010262.xlsx';

try {
    console.log(`Reading ${FILE}...`);
    const workbook = XLSX.readFile(FILE);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get headers (first row)
    const headers = [];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ c: C, r: 0 })];
        if (cell && cell.v) headers.push(cell.v);
    }

    console.log('--- HEADERS FOUND ---');
    console.log(JSON.stringify(headers, null, 2));

    // Print first 5 rows of data to see values and if Pattern ID repeats
    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length > 0) {
        console.log('\n--- FIRST 5 ROWS DATA ---');
        console.log(JSON.stringify(data.slice(0, 5), null, 2));

        const patterns = data.map(d => d['Pattern No']);
        const uniquePatterns = new Set(patterns);
        console.log(`\nTotal Rows: ${data.length}`);
        console.log(`Unique Patterns: ${uniquePatterns.size}`);
        console.log(`Is Product No Unique? ${new Set(data.map(d => d['Product No'])).size === data.length}`);
    }

} catch (e) {
    console.error('Error:', e.message);
}
