export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }

  try {
    const { favorites, userId } = req.body;

    console.log('[Favorites UPDATE] Received request');
    console.log('[Favorites UPDATE] User ID:', userId);
    console.log('[Favorites UPDATE] Favorites count:', favorites?.length);

    if (!favorites) {
      return res.status(400).json({ success: false, error: 'Favorites requerido' });
    }

    if (!Array.isArray(favorites)) {
      return res.status(400).json({ success: false, error: 'Favorites debe ser un array' });
    }

    for (let i = 0; i < favorites.length; i++) {
      const item = favorites[i];
      if (!item || typeof item !== 'string') {
        return res.status(400).json({ success: false, error: `Favorito ${i} debe ser un string (ID del wallpaper)` });
      }
    }
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    console.log('[Favorites UPDATE] KV URL configured:', !!kvUrl);
    console.log('[Favorites UPDATE] KV Token configured:', !!kvToken);
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Favorites UPDATE] KV not configured properly');
      return res.status(503).json({ 
        error: '⚠️ Base de datos no configurada',
        needsConfig: true
      });
    }

    const key = userId ? `favorites_${userId}` : 'favorites';
    console.log('[Favorites UPDATE] Saving to KV with key:', key);
    
    try {
      const kvResponse = await fetch(`${kvUrl}/set/${key}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(favorites),
      });

      if (!kvResponse.ok) {
        const errorText = await kvResponse.text();
        console.error('[Favorites UPDATE] KV API error:', kvResponse.status, errorText);
        throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
      }

      console.log('[Favorites UPDATE] Favorites saved successfully');
      
      return res.status(200).json({ 
        success: true,
        count: favorites.length,
        timestamp: Date.now(),
        usingKV: true
      });
    } catch (kvError) {
      console.error('[Favorites UPDATE] KV error:', kvError);
      return res.status(500).json({ 
        success: false,
        error: 'Error al guardar en la base de datos',
        details: process.env.NODE_ENV === 'development' ? (kvError instanceof Error ? kvError.message : 'Unknown error') : undefined,
        needsConfig: false
      });
    }
  } catch (error) {
    console.error('[Favorites UPDATE] Error updating favorites:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al actualizar los favoritos',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
