const initialWallpapers = [
  {
    id: '1',
    name: 'Papel Tapiz Moderno',
    description: 'Diseño contemporáneo con patrones geométricos',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800',
    category: 'Moderno',
    inStock: true,
    dimensions: '10m x 0.53m',
  },
  {
    id: '2',
    name: 'Papel Tapiz Clásico',
    description: 'Elegante diseño tradicional',
    price: 249.99,
    image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800',
    category: 'Clásico',
    inStock: true,
    dimensions: '10m x 0.53m',
  },
];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['GET', 'OPTIONS'] });
  }

  try {
    console.log('[Catalog GET] Fetching catalog from KV...');

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    console.log('[Catalog GET] KV URL configured:', !!kvUrl);
    console.log('[Catalog GET] KV Token configured:', !!kvToken);

    let catalog;

    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';

    if (!kvConfigured) {
      console.warn('[Catalog GET] KV not configured, using default catalog');
      catalog = initialWallpapers;
    } else {
      try {
        console.log('[Catalog GET] Fetching from KV REST API...');

        // Initialize merging map
        const mergedCatalog = new Map();

        // 1. Fetch Legacy Array
        try {
          const kvResponse = await fetch(`${kvUrl}/get/wallpapers_catalog`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${kvToken}` }
          });
          if (kvResponse.ok) {
            const kvData = await kvResponse.json();
            if (Array.isArray(kvData.result)) {
              console.log(`[Catalog GET] Loaded ${kvData.result.length} legacy items.`);
              kvData.result.forEach(item => {
                if (item && item.id) mergedCatalog.set(item.id.toString(), item);
              });
            }
          }
        } catch (e) {
          console.warn('[Catalog GET] Legacy fetch warning:', e.message);
        }

        // 2. Fetch Hash Data (Overlays/Repairs)
        try {
          const kvResponseHash = await fetch(`${kvUrl}/hgetall/wallpapers_catalog_hash`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${kvToken}` }
          });
          if (kvResponseHash.ok) {
            const hashData = await kvResponseHash.json();
            if (hashData.result) {
              const hashItems = Object.values(hashData.result);
              console.log(`[Catalog GET] Loaded ${hashItems.length} hash items (merging...).`);
              hashItems.forEach(raw => {
                const item = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (item && item.id) mergedCatalog.set(item.id.toString(), item);
              });
            }
          }
        } catch (e) {
          console.warn('[Catalog GET] Hash fetch warning:', e.message);
        }

        catalog = Array.from(mergedCatalog.values());

        // --- Normal Processing continues ---

        if (catalog && Array.isArray(catalog) && catalog.length > 0) {

          // 1. Server-Side Filtering by Collection (Optimization)
          const targetCollection = req.query.collection;
          if (targetCollection) {
            console.log(`[Catalog GET] Filtering by collection: "${targetCollection}"`);
            // Case-insensitive filtering
            catalog = catalog.filter(item =>
              item.collection &&
              item.collection.toLowerCase() === targetCollection.toLowerCase()
            );
            console.log(`[Catalog GET] Found ${catalog.length} items in collection`);
          }

          const isLite = req.query.lite === 'true';
          console.log(`[Catalog GET] Processing catalog (Lite Mode: ${isLite})...`);

          catalog = catalog.map(item => {
            if (!item || typeof item !== 'object') return null;

            // Base fields needed for Listing
            // Ensure imageUrl is a string, not array
            let finalImage = '';
            if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.length > 5) {
              finalImage = item.imageUrl;
            } else if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
              finalImage = item.imageUrls[0];
            }

            const liteItem = {
              id: item.id?.toString(),
              name: item.name,
              price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0,
              imageUrl: finalImage,
              category: item.category || 'General',
              collection: item.collection || '',
              group: item.group || item.id, // Fallback to ID if no group
              style: item.style || 'Moderno',
              inStock: item.inStock !== undefined ? item.inStock : true,
              // Keep minimal dimensions for sorting/filtering if needed, but strip heavy objects if possible
              // Actually dimensions are small (width/height numbers). Keep them.
              dimensions: {
                width: typeof item.dimensions?.width === 'number' ? item.dimensions.width : 0.53,
                height: typeof item.dimensions?.height === 'number' ? item.dimensions.height : 10.05
              }
            };

            if (isLite) {
              return liteItem;
            }

            // Full Mode: Add the rest
            return {
              ...liteItem,
              description: item.description || '',
              imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
              colors: Array.isArray(item.colors) ? item.colors : [],
              dimensions: {
                ...liteItem.dimensions,
                coverage: typeof item.dimensions?.coverage === 'number' ? item.dimensions.coverage : 5.33,
                weight: item.dimensions?.weight,
              },
              specifications: item.specifications || {},
              patternRepeat: item.patternRepeat || 0,
              patternMatch: item.patternMatch || '',
              rating: item.rating || 0,
              reviews: item.reviews || 0,
            };
          }).filter(item => item !== null && item.id && item.name);
        }

        console.log('[Catalog GET] KV fetch successful, catalog exists:', !!catalog);
        console.log('[Catalog GET] Catalog items count:', Array.isArray(catalog) ? catalog.length : 0);
      } catch (kvError) {
        console.error('[Catalog GET] KV error, using fallback:', kvError);
        catalog = null;
      }

      if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
        console.log('[Catalog GET] No catalog found or empty, initializing with default data');
        catalog = initialWallpapers;

        try {
          console.log('[Catalog GET] Saving default catalog to KV...');
          const saveResponse = await fetch(`${kvUrl}/set/wallpapers_catalog`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${kvToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(catalog),
          });

          if (saveResponse.ok) {
            console.log('[Catalog GET] Default catalog saved to KV');
          } else {
            console.error('[Catalog GET] Could not save to KV:', saveResponse.status);
          }
        } catch (kvError) {
          console.error('[Catalog GET] Could not save to KV, continuing with default:', kvError);
        }
      }
    }

    console.log('[Catalog GET] Returning catalog with', Array.isArray(catalog) ? catalog.length : 0, 'items');

    return res.status(200).json({
      success: true,
      catalog,
      timestamp: Date.now(),
      usingKV: kvConfigured,
      debug_info: {
        kv_url_prefix: kvUrl ? kvUrl.substring(0, 15) + '...' : 'undefined',
        kv_token_prefix: kvToken ? kvToken.substring(0, 5) + '...' : 'undefined',
        raw_item_count: catalog ? catalog.length : 0
      }
    });
  } catch (error) {
    console.error('[Catalog GET] Error fetching catalog:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener el catálogo',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
