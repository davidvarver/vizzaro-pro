const fs = require('fs');
const path = require('path');
const { createClient } = require('@vercel/kv'); // Assuming we can use the same logic as checkout/import

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN || 'https://vizzaro-pro.vercel.app';

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.error('❌ Missing KV credentials in .env');
    process.exit(1);
}

const kv = createClient({
    url: KV_REST_API_URL,
    token: KV_REST_API_TOKEN,
});

async function generateSitemap() {
    console.log('🗺️ Generating Sitemap...');

    try {
        // 1. Fetch Static Pages
        const staticPages = [
            '',          // /
            '/home',
            '/catalog',
            // '/checkout', // Usually we don't index checkout
            // '/terms-of-sale' // Maybe index
        ];

        // 2. Fetch Products from KV
        console.log('📦 Fetching catalog from KV...');
        const catalog = await kv.get('wallpapers_catalog');

        if (!Array.isArray(catalog)) {
            throw new Error('Invalid catalog data format');
        }

        console.log(`✅ Found ${catalog.length} products to index.`);

        // 3. Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        // Add Static Pages
        staticPages.forEach(page => {
            xml += `
  <url>
    <loc>${DOMAIN}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === '' || page === '/home' ? '1.0' : '0.8'}</priority>
  </url>`;
        });

        // Add Products
        catalog.forEach(product => {
            // Use lastModified if available, else standard date
            const lastMod = new Date().toISOString().split('T')[0];

            xml += `
  <url>
    <loc>${DOMAIN}/wallpaper/${product.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${lastMod}</lastmod>
  </url>`;
        });

        xml += `
</urlset>`;

        // 4. Save to public/sitemap.xml
        const publicDir = path.join(__dirname, '../public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
        }

        const sitemapPath = path.join(publicDir, 'sitemap.xml');
        fs.writeFileSync(sitemapPath, xml);

        console.log(`✅ Sitemap saved to ${sitemapPath}`);

    } catch (error) {
        console.error('❌ Error generating sitemap:', error);
        process.exit(1);
    }
}

generateSitemap();
