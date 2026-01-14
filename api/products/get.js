
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Missing product ID' });
    }

    try {
        const kvUrl = process.env.KV_REST_API_URL;
        const kvToken = process.env.KV_REST_API_TOKEN;

        if (!kvUrl || !kvToken) {
            return res.status(500).json({ success: false, error: 'KV not configured' });
        }

        // Optimization: Instead of fetching whole catalog, check if we can fetch single item?
        // Redis (KV) is key-value. 'wallpapers_catalog' is a LIST or JSON object.
        // We cannot query inside JSON easily without fetching it all, UNLESS we stored items individually.
        // Strategy: We still have to fetch specific items.
        // BUT! Since we can't fetch single item from a JSON array in KV efficiently without downloading it...
        // WAIT. If we are downloading the whole 7MB JSON just to find one ID, that's bad too.

        // TEMPORARY SOLUTION:
        // We will trust the Client has the "Lite" data. 
        // Is there a way to store items individually?
        // "products/ID" key? 
        // The import script DOES NOT saving items individually yet.
        // Modification: We should just fetch the catalog and find it? NO, same memory crash.

        // CRITICAL: We need a better KV structure. 
        // `wallpapers_catalog` (Lite List) AND `product:ID` (Full Data).

        // Since we can't re-run import instantaneously to restructure KV...
        // We must rely on the fact that Serverless Function has slightly more memory than the Body Response Limit.
        // We can fetch the catalog, find the item, and return ONLY that item.
        // The response body will be small. The memory usage might be high but maybe acceptable.

        const kvResponse = await fetch(`${kvUrl}/get/wallpapers_catalog`, {
            headers: { 'Authorization': `Bearer ${kvToken}` }
        });

        const kvData = await kvResponse.json();
        let catalog = [];
        try {
            if (kvData.result && typeof kvData.result === 'string') {
                catalog = JSON.parse(kvData.result);
            } else if (kvData.result) {
                catalog = kvData.result;
            }
        } catch (e) { }

        const product = catalog.find(p => p.id === id || p.id === parseInt(id));

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        return res.status(200).json({ success: true, product });

    } catch (error) {
        console.error('[Product GET] Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
