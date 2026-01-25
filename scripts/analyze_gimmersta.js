const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../GW Products 1010262.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert first few rows to JSON to see structure
    const data = XLSX.utils.sheet_to_json(sheet, { limit: 3 });

    console.log('--- HEADERS ---');
    console.log('--- HEADERS LIST ---');
    if (data.length > 0) {
        Object.keys(data[0]).sort().forEach(k => console.log(k));
    } else {
        console.log('Sheet appears empty');
    }

} catch (e) {
    console.error('Error reading file:', e);
}
