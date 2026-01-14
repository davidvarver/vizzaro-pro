export default async function handler(request, response) {
    try {
        const { kv } = require('@vercel/kv');

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

        // Fetch the full catalog associated with 'wallpapers_catalog' key
        const catalog = await kv.get('wallpapers_catalog');

        if (!catalog || !Array.isArray(catalog)) {
            return response.status(200).json({
                success: true,
                collections: []
            });
        }

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

            // Filter out system folders/artifacts or empty names
            if (!collectionName ||
                collectionName.toUpperCase() === 'ALL DATA' ||
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
        const collections = Array.from(collectionsMap.values())
            .filter(col => col.thumbnail) // ONLY show collections with a valid thumbnail
            .sort((a, b) => a.name.localeCompare(b.name));

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
