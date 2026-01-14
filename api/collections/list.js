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
        // Note: For very large catalogs, we might eventually need a separate 'collections' key
        // but for now, aggregating from the main catalog is the source of truth.
        const catalog = await kv.get('wallpapers_catalog');

        if (!catalog || !Array.isArray(catalog)) {
            return response.status(200).json({
                success: true,
                collections: []
            });
        }

        // Aggregate collections
        const collectionsMap = new Map();

        catalog.forEach(item => {
            if (!item.collection) return;

            const collectionName = item.collection.trim();
            if (!collectionName) return;

            if (!collectionsMap.has(collectionName)) {
                collectionsMap.set(collectionName, {
                    id: collectionName, // simple ID for now, effectively the name
                    name: collectionName,
                    count: 0,
                    thumbnail: item.imageUrls?.[0] || item.imageUrl || null
                });
            }

            const col = collectionsMap.get(collectionName);
            col.count++;

            // Update thumbnail if the current one is null but this item has one
            if (!col.thumbnail && (item.imageUrls?.[0] || item.imageUrl)) {
                col.thumbnail = item.imageUrls?.[0] || item.imageUrl;
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
