
const fs = require('fs');
const path = require('path');

const DIR = './imagenes gimmersta';
const PATTERNS_TO_SEARCH = ['10444', '10446', '10451', '10452'];

function searchImages() {
    try {
        console.log(`Scanning ${DIR}...`);
        const files = fs.readdirSync(DIR);

        console.log(`\nTotal files in directory: ${files.length}`);
        console.log('--- SAMPLE OF FIRST 10 FILES ---');
        files.slice(0, 10).forEach(f => console.log(f));

        console.log('\n--- LOOKING FOR SPECIFIC EXAMPLES ---');
        PATTERNS_TO_SEARCH.forEach(p => {
            const matches = files.filter(f => f.includes(p));
            console.log(`Matches for "${p}":`);
            if (matches.length === 0) console.log('  (None)');
            else matches.forEach(m => console.log(`  - ${m}`));
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

searchImages();
