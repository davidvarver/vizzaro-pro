import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
import { validateRequest, catalogUpdateSchema } from '../_schemas.js';
import { requireAdmin } from '../_authMiddleware.js';

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
    console.log('[Catalog UPDATE] Received request');

    const adminUser = requireAdmin(req, res);
    if (!adminUser) {
      return;
    }

    const validation = validateRequest(catalogUpdateSchema, req.body);
    if (!validation.success) {
      console.log('[Catalog UPDATE] Validation failed:', validation.errors);
      return res.status(422).json({ 
        success: false, 
        error: 'Datos inválidos', 
        validationErrors: validation.errors 
      });
    }

    const { catalog } = validation.data;

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

    console.log('[Catalog UPDATE] Saving catalog and individual items to KV...');
    
    try {
      const catalogResponse = await fetch(`${kvUrl}/set/wallpapers_catalog`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(catalog),
      });

      if (!catalogResponse.ok) {
        const errorText = await catalogResponse.text();
        console.error('[Catalog UPDATE] KV API error:', catalogResponse.status, errorText);
        throw new Error(`KV API error: ${catalogResponse.status} - ${errorText}`);
      }

      for (const item of catalog) {
        const itemKey = `catalog:item:${item.id}`;
        const itemResponse = await fetch(`${kvUrl}/set/${itemKey}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${kvToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item),
        });

        if (!itemResponse.ok) {
          console.error(`[Catalog UPDATE] Failed to save item ${item.id}`);
        }
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
