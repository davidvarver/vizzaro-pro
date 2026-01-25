require('dotenv').config();
const Client = require('ssh2-sftp-client');

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function main() {
    const sftp = new Client();
    await sftp.connect(FTP_CONFIG);

    // Target a specific collection known to have variants
    // List root to find exact folder name
    const rootItems = await sftp.list('/WallpaperBooks');
    const folder = rootItems.find(f => f.type === 'd' && f.name.includes('Advantage Cuba'));

    if (!folder) {
        console.error('❌ Collection folder not found in root!');
        sftp.end();
        return;
    }

    const collectionPath = `/WallpaperBooks/${folder.name}`;
    console.log(`📂 Found correct path: ${collectionPath}`);

    const list = await sftp.list(collectionPath);
    console.log(`✅ Total items in folder: ${list.length}`);
    console.log('Sample items:', list.slice(0, 5).map(f => f.name));

    const images = list.filter(f => f.name.match(/\.(jpg|jpeg|png)$/i));

    if (images.length === 0) {
        console.error('❌ No images found in this folder!');
        sftp.end();
        return;
    }

    const sampleImage = images[0];
    const productIdBase = sampleImage.name.split('.')[0].split('_')[0]; // simple heuristic

    console.log(`🔎 Testing Variant Logic for Base ID: ${productIdBase}`);

    // ORIGINAL LOGIC (Current Bug)
    const singleMatch = images.find(img => img.name.includes(productIdBase));
    console.log(`❌ Current logic found 1 file: ${singleMatch ? singleMatch.name : 'NONE'}`);

    // PROPOSED LOGIC (Recursive Hunter)
    const variants = images.filter(img => {
        // Normalize names to handle case sensitivity
        const name = img.name.toLowerCase();
        const base = productIdBase.toLowerCase();

        // Exact start match logic
        // "4044-88031.jpg" -> starts with "4044-88031"
        // "4044-88031_Room.jpg" -> starts with "4044-88031"
        return name.startsWith(base);
    });

    console.log(`✅ New logic found ${variants.length} files:`);
    variants.forEach(v => console.log(`   - ${v.name}`));

    sftp.end();
}

main();
