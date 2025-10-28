import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
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
    const adminUser = requireAdmin(req, res);
    if (!adminUser) {
      return;
    }

    const { orderId, updates } = req.body;

    console.log('[Orders UPDATE] Received request');
    console.log('[Orders UPDATE] Order ID:', orderId);
    console.log('[Orders UPDATE] Admin user:', adminUser.email);

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID requerido' });
    }

    if (!updates) {
      return res.status(400).json({ success: false, error: 'Actualizaciones requeridas' });
    }

    if (typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'Order ID debe ser un string' });
    }

    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Updates debe ser un objeto' });
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
      return res.status(500).json({ success: false, error: 'Error al procesar datos del pedido' });
    }

    if (!existingOrder) {
      return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
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
      success: false,
      error: 'Error al actualizar el pedido',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
