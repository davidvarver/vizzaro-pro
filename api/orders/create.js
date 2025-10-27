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

  if (rateLimit(req, res, { maxRequests: 10 })) {
    return;
  }

  try {
    const { order } = req.body;

    console.log('[Orders CREATE] Received request');

    if (!order || typeof order !== 'object') {
      return res.status(400).json({ error: 'Order data required' });
    }
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    console.log('[Orders CREATE] KV URL configured:', !!kvUrl);
    console.log('[Orders CREATE] KV Token configured:', !!kvToken);
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Orders CREATE] KV not configured properly');
      return res.status(503).json({ 
        error: '⚠️ Base de datos no configurada. Por favor configura Vercel KV.',
        needsConfig: true
      });
    }

    const orderId = Date.now().toString();
    const newOrder = {
      ...order,
      id: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log('[Orders CREATE] Saving order with ID:', orderId);
    
    const orderKey = `order:${orderId}`;
    const kvResponse = await fetch(`${kvUrl}/set/${orderKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newOrder),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error('[Orders CREATE] KV API error:', kvResponse.status, errorText);
      throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
    }

    console.log('[Orders CREATE] Adding order to index...');
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
        console.warn('[Orders CREATE] Error parsing index, starting fresh:', parseError);
        orderIds = [];
      }
    }

    if (!Array.isArray(orderIds)) {
      orderIds = [];
    }

    orderIds = [orderId, ...orderIds];

    const updateIndexResponse = await fetch(`${kvUrl}/set/${indexKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderIds),
    });

    if (!updateIndexResponse.ok) {
      console.error('[Orders CREATE] Failed to update index, but order was saved');
    }

    console.log('[Orders CREATE] Order created successfully:', orderId);
    
    return res.status(200).json({ 
      success: true,
      orderId: orderId,
      order: newOrder,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    console.error('[Orders CREATE] Error creating order:', error);
    return res.status(500).json({ 
      error: 'Error al crear el pedido',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
