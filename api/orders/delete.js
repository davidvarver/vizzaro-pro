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

    const { orderId } = req.body;

    console.log('[Orders DELETE] Received request');
    console.log('[Orders DELETE] Order ID:', orderId);
    console.log('[Orders DELETE] Admin user:', adminUser.email);

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID requerido' });
    }

    if (typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'Order ID debe ser un string' });
    }
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Orders DELETE] KV not configured properly');
      return res.status(503).json({ 
        error: '⚠️ Base de datos no configurada',
        needsConfig: true
      });
    }

    console.log('[Orders DELETE] Deleting order...');
    const orderKey = `order:${orderId}`;
    const deleteResponse = await fetch(`${kvUrl}/del/${orderKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    if (!deleteResponse.ok) {
      console.warn('[Orders DELETE] Order not found or error deleting:', orderId);
    }

    console.log('[Orders DELETE] Removing from index...');
    const indexKey = 'orders:index';
    const indexResponse = await fetch(`${kvUrl}/get/${indexKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    let orderIds = [];
    if (indexResponse.ok) {
      const indexData = await indexResponse.json();
      const rawResult = indexData.result;
      try {
        if (rawResult && typeof rawResult === 'string') {
          orderIds = JSON.parse(rawResult);
        } else if (rawResult && typeof rawResult === 'object') {
          orderIds = rawResult;
        }
      } catch (parseError) {
        console.warn('[Orders DELETE] Error parsing index:', parseError);
        orderIds = [];
      }
    }

    if (Array.isArray(orderIds)) {
      orderIds = orderIds.filter(id => id !== orderId);
      
      const updateIndexResponse = await fetch(`${kvUrl}/set/${indexKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderIds),
      });

      if (!updateIndexResponse.ok) {
        console.error('[Orders DELETE] Failed to update index');
      }
    }

    console.log('[Orders DELETE] Order deleted successfully:', orderId);
    
    return res.status(200).json({ 
      success: true,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    console.error('[Orders DELETE] Error deleting order:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al eliminar el pedido',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
