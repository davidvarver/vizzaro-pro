import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimit(req, res, { maxRequests: 20 })) {
    return;
  }

  try {
    const { orderId, updates, adminToken } = req.body;

    console.log('[Orders UPDATE] Received request');
    console.log('[Orders UPDATE] Order ID:', orderId);
    console.log('[Orders UPDATE] Admin token provided:', !!adminToken);

    const expectedToken = process.env.ADMIN_SECRET_TOKEN || process.env.EXPO_PUBLIC_ADMIN_TOKEN || 'vizzaro_admin_secret_2025';

    if (!adminToken || adminToken !== expectedToken) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (!orderId || !updates) {
      return res.status(400).json({ error: 'Order ID and updates required' });
    }

    if (typeof orderId !== 'string' || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid input format' });
    }
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Orders UPDATE] KV not configured properly');
      return res.status(503).json({ 
        error: '⚠️ Base de datos no configurada',
        needsConfig: true
      });
    }

    console.log('[Orders UPDATE] Fetching existing order...');
    const orderKey = `order:${orderId}`;
    const getResponse = await fetch(`${kvUrl}/get/${orderKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    if (!getResponse.ok) {
      console.log('[Orders UPDATE] Order not found:', orderId);
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const orderData = await getResponse.json();
    let existingOrder = null;
    
    try {
      const rawResult = orderData.result;
      if (rawResult && typeof rawResult === 'string') {
        existingOrder = JSON.parse(rawResult);
      } else if (rawResult && typeof rawResult === 'object') {
        existingOrder = rawResult;
      }
    } catch (parseError) {
      console.error('[Orders UPDATE] Error parsing order data:', parseError);
      return res.status(500).json({ error: 'Error al procesar datos del pedido' });
    }

    if (!existingOrder) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const updatedOrder = {
      ...existingOrder,
      ...updates,
      id: orderId,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('[Orders UPDATE] Saving updated order to KV...');
    const kvResponse = await fetch(`${kvUrl}/set/${orderKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedOrder),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error('[Orders UPDATE] KV API error:', kvResponse.status, errorText);
      throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
    }

    console.log('[Orders UPDATE] Order updated successfully:', orderId);
    
    return res.status(200).json({ 
      success: true,
      order: updatedOrder,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    console.error('[Orders UPDATE] Error updating order:', error);
    return res.status(500).json({ 
      error: 'Error al actualizar el pedido',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
