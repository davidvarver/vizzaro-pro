import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
import { verifyToken } from '../_authMiddleware.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['GET', 'OPTIONS'] });
  }

  if (rateLimit(req, res, { maxRequests: 30 })) {
    return;
  }

  try {
    const authResult = verifyToken(req, res);
    if (!authResult.success) {
      console.log('[Favorites GET] Auth failed:', authResult.error);
      return res.status(authResult.statusCode || 401).json({ 
        success: false, 
        error: authResult.error 
      });
    }

    const userId = authResult.user.userId;
    
    console.log('[Favorites GET] Fetching favorites from KV for user:', userId);
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    console.log('[Favorites GET] KV URL configured:', !!kvUrl);
    console.log('[Favorites GET] KV Token configured:', !!kvToken);
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Favorites GET] KV not configured, returning empty favorites');
      return res.status(200).json({ 
        success: true, 
        favorites: [],
        timestamp: Date.now(),
        usingKV: false
      });
    }

    try {
      const key = userId ? `favorites_${userId}` : 'favorites';
      console.log('[Favorites GET] Fetching from KV with key:', key);
      
      const kvResponse = await fetch(`${kvUrl}/get/${key}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
        },
      });

      if (kvResponse.ok) {
        const kvData = await kvResponse.json();
        console.log('[Favorites GET] KV response:', kvData);
        const rawResult = kvData.result;
        
        let favorites = null;
        try {
          if (rawResult && typeof rawResult === 'string') {
            favorites = JSON.parse(rawResult);
          } else if (rawResult && typeof rawResult === 'object') {
            favorites = rawResult;
          }
        } catch (parseError) {
          console.error('[Favorites GET] Error parsing favorites:', parseError);
          favorites = [];
        }

        if (favorites && !Array.isArray(favorites)) {
          console.warn('[Favorites GET] Favorites is not an array, resetting');
          favorites = [];
        }
        
        console.log('[Favorites GET] KV fetch successful, favorites exist:', !!favorites);
        console.log('[Favorites GET] Favorites count:', Array.isArray(favorites) ? favorites.length : 0);
        
        return res.status(200).json({ 
          success: true, 
          favorites: favorites || [],
          timestamp: Date.now(),
          usingKV: true
        });
      } else {
        const errorText = await kvResponse.text();
        console.warn('[Favorites GET] KV returned error:', kvResponse.status, errorText);
        
        return res.status(200).json({ 
          success: true, 
          favorites: [],
          timestamp: Date.now(),
          usingKV: true
        });
      }
    } catch (kvError) {
      console.error('[Favorites GET] KV error:', kvError);
      return res.status(500).json({ 
        success: false,
        error: 'Error al obtener los favoritos',
        details: process.env.NODE_ENV === 'development' ? (kvError instanceof Error ? kvError.message : 'Unknown error') : undefined
      });
    }
  } catch (error) {
    console.error('[Favorites GET] Error fetching favorites:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al obtener los favoritos',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
