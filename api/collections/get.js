const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

const isKVConfigured = KV_REST_API_URL && 
                       KV_REST_API_TOKEN && 
                       !KV_REST_API_URL.includes('your-') && 
                       !KV_REST_API_TOKEN.includes('your-');

export default async function handler(req, res) {
  console.log('[collections/get] Request received');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!isKVConfigured) {
      console.log('[collections/get] KV not configured, returning defaults');
      return res.status(200).json({
        success: true,
        collections: getDefaultCollections(),
        timestamp: Date.now(),
        needsConfig: true,
      });
    }

    console.log('[collections/get] Fetching from KV...');
    const getResponse = await fetch(
      `${KV_REST_API_URL}/get/collections`,
      {
        headers: {
          Authorization: `Bearer ${KV_REST_API_TOKEN}`,
        },
      }
    );

    if (!getResponse.ok) {
      console.error('[collections/get] KV fetch failed:', getResponse.status);
      throw new Error('Failed to fetch from KV');
    }

    const getData = await getResponse.json();
    let collections = [];

    if (getData.result) {
      const rawResult = getData.result;
      let parsedResult;
      
      if (typeof rawResult === 'string') {
        try {
          parsedResult = JSON.parse(rawResult);
        } catch (parseError) {
          console.error('[collections/get] JSON parse error:', parseError);
          parsedResult = [];
        }
      } else {
        parsedResult = rawResult;
      }
      
      collections = Array.isArray(parsedResult) ? parsedResult : [];
      console.log('[collections/get] Loaded from KV:', collections.length, 'items');
    } else {
      console.log('[collections/get] No data in KV, using defaults');
      collections = getDefaultCollections();
    }

    return res.status(200).json({
      success: true,
      collections,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[collections/get] Error:', error);
    return res.status(200).json({
      success: true,
      collections: getDefaultCollections(),
      timestamp: Date.now(),
      fallback: true,
    });
  }
}

function getDefaultCollections() {
  return [
    {
      id: 'blanco-negro',
      name: 'Blanco & Negro Moderno',
      image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=600&fit=crop&auto=format&q=80',
      colors: ['Blanco', 'Negro', 'Gris'],
      category: 'Geométrico',
      featured: true,
    },
    {
      id: 'textura-beige',
      name: 'Textura Beige Soft',
      image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&h=600&fit=crop&auto=format&q=80',
      colors: ['Beige', 'Crema'],
      category: 'Textura',
      featured: false,
    },
    {
      id: 'geometria-gold',
      name: 'Geometría Gold Line',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&auto=format&q=80',
      colors: ['Dorado', 'Negro'],
      category: 'Geométrico',
      featured: false,
    },
  ];
}
