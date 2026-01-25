require('dotenv').config();
const Client = require('ssh2-sftp-client');

const FTP_CONFIG = {
    host: 'ftpimages.brewsterhomefashions.com',
    username: 'dealers',
    password: 'Brewster#1',
    port: 22,
};

async function main() {
    console.log('🔍 SCANNING ROOTS...');
    const sftp = new Client();
    await sftp.connect(FTP_CONFIG);

    // 1. List Top Level
    const roots = await sftp.list('/WallpaperBooks');
    console.log(`✅ Found ${roots.length} collections.`);

    // 2. Find "Advantage Cuba" and "Advantage Bath"
    const targets = roots.filter(f =>
        f.name.includes('Advantage Cuba') ||
        f.name.includes('Advantage Bath')
    );

    console.log('\n📂 Target Folders Found:');
    targets.forEach(t => console.log(`   - ${t.name} (${t.type})`));

    // 3. Deep Scan Target
    if (targets.length > 0) {
        const target = targets[0]; // Pick first one
        const path = `/WallpaperBooks/${target.name}`;
        console.log(`\n🕵️ Deep scanning: ${path}`);

        const content = await sftp.list(path);
        console.log(`   ✅ Content count: ${content.length}`);
        console.log('   📄 First 10 items:');
        content.slice(0, 10).forEach(c => console.log(`      - ${c.name} (${c.type}, size: ${c.size})`));

        // Check for subfolders?
        const subfolders = content.filter(c => c.type === 'd');
        if (subfolders.length > 0) {
            console.log(`\n   📂 Subfolders found: ${subfolders.length}`);
            // Check inside subfolder
            const subPath = `${path}/${subfolders[0].name}`;
            console.log(`   🕵️ Peeking inside subfolder: ${subPath}`);
            const subContent = await sftp.list(subPath);
            console.log(`      Found ${subContent.length} items.`);
            console.log('      Sample:', subContent.slice(0, 3).map(s => s.name));
        }
    }

    sftp.end();
}

main();
