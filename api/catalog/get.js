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
        console.log('[Catalog GET] KV URL:', kvUrl);
        const kvResponse = await fetch(`${kvUrl}/get/wallpapers_catalog`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${kvToken}`,
          },
        });

        if (kvResponse.ok) {
          const kvData = await kvResponse.json();
          console.log('[Catalog GET] KV response:', kvData);
          const rawResult = kvData.result;

          try {
            if (rawResult && typeof rawResult === 'string') {
              catalog = JSON.parse(rawResult);
            } else if (rawResult && typeof rawResult === 'object') {
              catalog = rawResult;
            } else {
              catalog = null;
            }
          } catch (parseError) {
            console.error('[Catalog GET] Error parsing KV data:', parseError);
            catalog = null;
          }

          if (catalog && !Array.isArray(catalog)) {
            console.warn('[Catalog GET] Catalog is not an array, resetting');
            catalog = null;
          }

          if (catalog && Array.isArray(catalog) && catalog.length > 0) {
            catalog = catalog.map(item => {
              if (!item || typeof item !== 'object') return null;

              return {
                ...item,
                price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0,
                imageUrl: item.imageUrl || '',
                imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
                category: item.category || 'General',
                style: item.style || 'Moderno',
                colors: Array.isArray(item.colors) ? item.colors : [],
                dimensions: {
                  width: typeof item.dimensions?.width === 'number' && !isNaN(item.dimensions.width) ? item.dimensions.width : 0.53,
                  height: typeof item.dimensions?.height === 'number' && !isNaN(item.dimensions.height) ? item.dimensions.height : 10.05,
                  coverage: typeof item.dimensions?.coverage === 'number' && !isNaN(item.dimensions.coverage) ? item.dimensions.coverage : 5.33,
                  weight: item.dimensions?.weight,
                },
                specifications: {
                  material: item.specifications?.material || 'Vinilo',
                  washable: item.specifications?.washable !== undefined ? item.specifications.washable : true,
                  removable: item.specifications?.removable !== undefined ? item.specifications.removable : true,
                  textured: item.specifications?.textured !== undefined ? item.specifications.textured : false,
                },
                patternRepeat: (() => {
                  // 1. Try explicit fields (deep search)
                  const val = item.patternRepeat ?? item.pattern_repeat ?? item.repetition ??
                    item.specifications?.patternRepeat ?? item.specifications?.repetition ??
                    item.dimensions?.patternRepeat ?? item.dimensions?.repetition;

                  if (val !== undefined && val !== null) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) return num;
                  }

                  // 2. Fallback: Try to extract from Description (e.g. "Repeat: 53.5", "Repetición: 64")
                  if (item.description) {
                    const regex = /(?:repeat|repetición|repetition|patrón|pattern)\s*[:.]?\s*(\d+(?:\.\d+)?)/i;
                    const match = item.description.match(regex);
                    if (match && match[1]) {
                      const extracted = parseFloat(match[1]);
                      return !isNaN(extracted) ? extracted : 0;
                    }
                  }

                  return 0;
                })(),
                patternMatch: item.patternMatch || item.pattern_match || item.match ||
                  item.specifications?.patternMatch || item.specifications?.match || '',
                inStock: item.inStock !== undefined ? item.inStock : true,
                rating: typeof item.rating === 'number' && !isNaN(item.rating) ? item.rating : 0,
                reviews: typeof item.reviews === 'number' && !isNaN(item.reviews) ? item.reviews : 0,
                description: item.description || '',
                _raw_debug: item // TEMPORARY DEBUG: Expose full source object
              };
            }).filter(item => item !== null && item.id && item.name);
          }

          console.log('[Catalog GET] KV fetch successful, catalog exists:', !!catalog);
          console.log('[Catalog GET] Catalog items count:', Array.isArray(catalog) ? catalog.length : 0);
        } else {
          const errorText = await kvResponse.text();
          console.warn('[Catalog GET] KV returned error:', kvResponse.status, errorText);
          catalog = null;
        }
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
