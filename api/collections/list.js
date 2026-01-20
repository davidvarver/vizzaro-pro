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

        // Aggregate collections
        const collectionsMap = new Map();

        // Helper to find any image-like string in values
        const findImage = (obj) => {
            // Priority check known keys
            if (obj.imageUrls && Array.isArray(obj.imageUrls) && obj.imageUrls.length > 0) return obj.imageUrls[0];
            if (obj.imageUrl && typeof obj.imageUrl === 'string' && obj.imageUrl.length > 5) return obj.imageUrl;
            if (obj.image && typeof obj.image === 'string' && obj.image.length > 5) return obj.image;

            // Fallback: search all keys for something that looks like a URL
            for (const key in obj) {
                const val = obj[key];
                if (typeof val === 'string' && val.startsWith('http') && (
                    val.endsWith('.jpg') || val.endsWith('.png') || val.endsWith('.jpeg') || val.endsWith('.webp')
                )) {
                    return val;
                }
            }
            return null;
        };

        catalog.forEach(item => {
            if (!item.collection) return;

            const collectionName = item.collection.trim();

            // Filter out system folders/artifacts or empty names (Removed ALL DATA as it is a valid imported collection)
            if (!collectionName ||
                collectionName.toUpperCase() === '300DPI' ||
                collectionName.toUpperCase() === 'HI-RES' ||
                collectionName.includes('.')) {
                return;
            }

            // Determine valid image using aggressive search
            const validImage = findImage(item);

            if (!collectionsMap.has(collectionName)) {
                collectionsMap.set(collectionName, {
                    id: collectionName, // simple ID for now, effectively the name
                    name: collectionName,
                    count: 0,
                    thumbnail: validImage
                });
            }

            const col = collectionsMap.get(collectionName);
            col.count++;

            // Update thumbnail if the current one is null but this item has a valid one
            if (!col.thumbnail && validImage) {
                col.thumbnail = validImage;
            }
        });

        // Convert map to array and sort alphabetically
        const collections = Array.from(collectionsMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );

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
