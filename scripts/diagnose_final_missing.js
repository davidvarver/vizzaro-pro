
require('dotenv').config();
const { createClient } = require('@vercel/kv');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
    IMAGES_DIR: './imagenes gimmersta',
};

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function scanLocalRecursively(dirPath, fileList = [], folderList = []) {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const resPath = path.resolve(dirPath, file.name);
            if (file.isDirectory()) {
                folderList.push({ name: file.name, path: resPath });
                await scanLocalRecursively(resPath, fileList, folderList);
            } else {
                fileList.push({ name: file.name, path: resPath });
            }
        }
    } catch (e) {
        console.warn(`Error scanning ${dirPath}: ${e.message}`);
    }
    return { files: fileList, folders: folderList };
}

async function diagnose() {
    console.log('🕵️ STARTING DEEP DIAGNOSTIC...');

    // 1. Get Missing Collections
    const seriesIndex = await kv.get('wallpapers_series_index');
    const missing = seriesIndex.filter(col => !col.thumbnail && (col.provider === 'Gimmersta' || !col.provider));
    console.log(`❌ Missing Collections: ${missing.length}`);

    // 2. Scan Local Files
    console.log('📂 Scanning local files...');
    const { files, folders } = await scanLocalRecursively(CONFIG.IMAGES_DIR);
    console.log(`   Found ${files.length} files and ${folders.length} folders.`);

    const report = [];

    // 3. Analyze Each Missing Collection
    for (const col of missing) {
        let status = {
            id: col.id,
            productCount: 0,
            hasFolderMatch: false,
            sampleProduct: null,
            fileMatch: 'NONE'
        };

        // Check Folder Name
        const folderMatch = folders.find(f => f.name.toLowerCase().includes(col.id.toLowerCase()));
        if (folderMatch) {
            status.hasFolderMatch = true;
            status.folderPath = folderMatch.path;
        }

        // Check Products
        const products = await kv.get(`collection:${col.id}`);
        if (products && products.length > 0) {
            status.productCount = products.length;
            const sample = products[0];
            status.sampleProduct = sample.id;

            // Try to match sample product
            const id = sample.id.toLowerCase().trim();
            const idNoDash = id.replace(/[^a-z0-9]/g, '');

            // Check exact/partial match in ALL files
            const match = files.find(f => {
                const name = f.name.toLowerCase();
                return name.includes(id) || name.includes(idNoDash);
            });

            if (match) {
                status.fileMatch = `FOUND: ${match.name}`;
            }
        }

        report.push(status);
    }

    // 4. Print Report
    console.log('\n📊 DIAGNOSTIC REPORT');
    console.log('====================');

    // Group 1: Collections with Folders but No Images (Weird)
    const withFolder = report.filter(r => r.hasFolderMatch);
    if (withFolder.length > 0) {
        console.log(`\n📁 Collections with MATCHING FOLDERS (${withFolder.length}):`);
        withFolder.forEach(r => {
            console.log(`   - ${r.id}`);
            console.log(`     Path: ${r.folderPath}`);
            console.log(`     Sample Product: ${r.sampleProduct} -> File Match? ${r.fileMatch}`);
        });
    } else {
        console.log('\n📁 No folders found matching collection names.');
    }

    // Group 2: Collections with File Matches (Should have been fixed)
    const withFiles = report.filter(r => r.fileMatch !== 'NONE');
    if (withFiles.length > 0) {
        console.log(`\n🖼️ Collections with FILE MATCHES (${withFiles.length}):`);
        withFiles.forEach(r => {
            console.log(`   - ${r.id} (Sample: ${r.sampleProduct})`);
            console.log(`     Match: ${r.fileMatch}`);
        });
    }

    // Group 3: Completely Missing
    const trulyMissing = report.filter(r => !r.hasFolderMatch && r.fileMatch === 'NONE');
    console.log(`\n👻 TRULY MISSING (${trulyMissing.length}):`);
    console.log('   (No matching folder AND no matching images for sample product)');
    console.log(`   Examples: ${trulyMissing.slice(0, 5).map(r => r.id).join(', ')}...`);

}

diagnose();
