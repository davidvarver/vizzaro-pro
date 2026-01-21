const { execSync } = require('child_process');

const collections = [
    'Advantage Beyond Textures',
    'Advantage Cuba',
    'Advantage Curio',
    'Advantage Deluxe',
    'Advantage Fusion',
    'Advantage Geo',
    'Advantage Kitchen',
    'Advantage Neural',
    'Advantage Splash',
    'Advantage Stones',
    'Advantage Trad',
    'Advantage Winsome',
    'A-Street Harmon',
    'A-Street Restored',
    'A-Street Solace',
    'A-Street Symetrie',
    'A-Street Vita',
    'Beacon House',
    'Blockprint',
    'Canton Road',
    'Darae',
    'Evolve',
    'Floorpsops',
    'Fresh Kitchens',
    'Georgia',
    'In Register',
    'Kenneth James',
    'Komar',
    'Mirabelle',
    'NuWallpaper',
    'P+S',
    'Pacific Designs',
    'Paintable',
    'Replicates',
    'Rosemore',
    'Scalamandre',
    'Scott Living',
    'Signature Series',
    'Textures',
    'The Avenues',
    'Twine',
    'Warner',
    'Zio and Sons'
];

// Based on the screenshot and index, this is a broad list. 
// The Image Hunter is robust enough to skip if folder not found or handle errors.

console.log(`🚀 Starting Global Pulse Batch Hunter for ${collections.length} collections...`);

for (const col of collections) {
    console.log(`\n\n--------------------------------------------------------------`);
    console.log(`🎯 TARGET: ${col}`);
    console.log(`--------------------------------------------------------------`);
    try {
        // Run synchronously to check output and avoid FTP overload
        execSync(`node scripts/image_hunter.js "${col}"`, { stdio: 'inherit' });
    } catch (e) {
        console.error(`❌ Error processing ${col}:`, e.message);
    }
}

console.log('\n✅ Global Pulse Completed.');
