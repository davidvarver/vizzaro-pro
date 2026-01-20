export default async function handler(request, response) {
    try {
        const { createClient } = require('@vercel/kv');
        const kv = createClient({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });

        // Enable CORS
        response.setHeader('Access-Control-Allow-Credentials', true);
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        response.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );

        if (request.method === 'OPTIONS') {
            response.status(200).end();
            return;
        }

        // 1. Fetch Lightweight Index (Fast!)
        const collections = await kv.get('wallpapers_series_index');

        if (!collections || collections.length === 0) {
            console.log('Index empty, trying legacy fallback...');
            // (Legacy fallback code or just return empty for safety to avoid crash)
            return response.status(200).json({ success: true, collections: [] });
        }

        return response.status(200).json({
            success: true,
            collections,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error listing collections:', error);
        return response.status(500).json({
            error: 'Error listing collections',
            details: error.message
        });
    }
}
