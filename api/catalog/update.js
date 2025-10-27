import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }

  if (rateLimit(req, res, { maxRequests: 20 })) {
    return;
  }

  try {
    const { catalog, adminToken } = req.body;

    console.log('[Catalog UPDATE] Received request');
    console.log('[Catalog UPDATE] Admin token provided:', !!adminToken);

    const expectedToken = process.env.ADMIN_SECRET_TOKEN || process.env.EXPO_PUBLIC_ADMIN_TOKEN || 'vizzaro_admin_secret_2025';

    if (!adminToken) {
      console.log('[Catalog UPDATE] No token provided');
      return res.status(401).json({ error: 'No autorizado - Token no proporcionado' });
    }

    if (adminToken !== expectedToken) {
      console.log('[Catalog UPDATE] Token mismatch');
      return res.status(401).json({ error: 'No autorizado - Token inválido' });
    }

    console.log('[Catalog UPDATE] Token validated successfully');

    if (!catalog) {
      return res.status(400).json({ success: false, error: 'Catálogo requerido' });
    }

    if (!Array.isArray(catalog)) {
      return res.status(400).json({ success: false, error: 'El catálogo debe ser un array' });
    }

    for (let i = 0; i < catalog.length; i++) {
      const item = catalog[i];
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ success: false, error: `Elemento ${i} del catálogo no es válido` });
      }
      if (!item.id || typeof item.id !== 'string') {
        return res.status(400).json({ success: false, error: `Elemento ${i} del catálogo no tiene un ID válido` });
      }
      if (!item.name || typeof item.name !== 'string') {
        return res.status(400).json({ success: false, error: `Elemento ${i} del catálogo no tiene un nombre válido` });
      }
      if (item.price !== undefined && (typeof item.price !== 'number' || item.price < 0)) {
        return res.status(400).json({ success: false, error: `Elemento ${i} del catálogo tiene un precio inválido` });
      }
    }

    console.log('[Catalog UPDATE] Updating catalog with', catalog.length, 'items');
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    console.log('[Catalog UPDATE] KV URL configured:', !!kvUrl);
    console.log('[Catalog UPDATE] KV Token configured:', !!kvToken);
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Catalog UPDATE] KV not configured properly');
      return res.status(503).json({ 
        error: '⚠️ Base de datos no configurada\n\nPara que los cambios persistan, configura Vercel KV:\n\n1. Ve a tu proyecto en Vercel\n2. Storage → Create Database → KV\n3. Copia las variables de entorno\n4. Settings → Environment Variables\n5. Agrega KV_REST_API_URL y KV_REST_API_TOKEN',
        needsConfig: true
      });
    }

    console.log('[Catalog UPDATE] Saving to KV using REST API...');
    
    try {
      const kvResponse = await fetch(`${kvUrl}/set/wallpapers_catalog`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(catalog),
      });

      if (!kvResponse.ok) {
        const errorText = await kvResponse.text();
        console.error('[Catalog UPDATE] KV API error:', kvResponse.status, errorText);
        throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
      }

      console.log('[Catalog UPDATE] Catalog saved successfully to KV');
      
      return res.status(200).json({ 
        success: true,
        message: 'Catálogo actualizado correctamente',
        itemCount: catalog.length,
        timestamp: Date.now(),
        usingKV: true
      });
    } catch (kvError) {
      console.error('[Catalog UPDATE] KV error:', kvError);
      return res.status(500).json({ 
        error: 'Error al guardar en la base de datos',
        details: kvError instanceof Error ? kvError.message : 'Unknown error',
        needsConfig: false
      });
    }
  } catch (error) {
    console.error('[Catalog UPDATE] Error updating catalog:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al actualizar el catálogo',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
