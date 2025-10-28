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
      console.log('[Orders GET] Auth failed:', authResult.error);
      return res.status(authResult.statusCode || 401).json({ 
        success: false, 
        error: authResult.error 
      });
    }

    const userId = authResult.user.userId;
    console.log('[Orders GET] Fetching orders from KV...');
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    console.log('[Orders GET] KV URL configured:', !!kvUrl);
    console.log('[Orders GET] KV Token configured:', !!kvToken);
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Orders GET] KV not configured, returning empty orders');
      return res.status(200).json({ 
        success: true, 
        orders: [],
        timestamp: Date.now(),
        usingKV: false
      });
    }

    try {
      console.log('[Orders GET] Fetching user orders from KV...');
      const userIndexKey = `orders:user:${userId}`;
      const indexResponse = await fetch(`${kvUrl}/lrange/${userIndexKey}/0/-1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
        },
      });

      let orderIds = [];
      if (indexResponse.ok) {
        const indexData = await indexResponse.json();
        const rawResult = indexData.result;
        
        if (Array.isArray(rawResult)) {
          orderIds = rawResult;
        } else if (rawResult && typeof rawResult === 'string') {
          try {
            orderIds = JSON.parse(rawResult);
          } catch (parseError) {
            console.warn('[Orders GET] Error parsing index:', parseError);
            orderIds = [];
          }
        }
      }

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        console.log('[Orders GET] No orders found in index');
        return res.status(200).json({ 
          success: true, 
          orders: [],
          timestamp: Date.now(),
          usingKV: true
        });
      }

      console.log('[Orders GET] Found', orderIds.length, 'order IDs, fetching details...');
      
      const orderPromises = orderIds.map(async (orderId) => {
        try {
          const orderKey = `order:${orderId}`;
          const orderResponse = await fetch(`${kvUrl}/get/${orderKey}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${kvToken}`,
            },
          });

          if (!orderResponse.ok) {
            console.warn('[Orders GET] Failed to fetch order:', orderId);
            return null;
          }

          const orderData = await orderResponse.json();
          const rawResult = orderData.result;
          
          if (rawResult && typeof rawResult === 'string') {
            return JSON.parse(rawResult);
          } else if (rawResult && typeof rawResult === 'object') {
            return rawResult;
          }
          
          return null;
        } catch (error) {
          console.error('[Orders GET] Error fetching order:', orderId, error);
          return null;
        }
      });

      const orders = (await Promise.all(orderPromises)).filter(order => order !== null);
      
      console.log('[Orders GET] Successfully fetched', orders.length, 'orders');
      
      return res.status(200).json({ 
        success: true, 
        orders,
        timestamp: Date.now(),
        usingKV: true
      });
    } catch (kvError) {
      console.error('[Orders GET] KV error:', kvError);
      return res.status(500).json({ 
        success: false,
        error: 'Error al obtener los pedidos',
        details: process.env.NODE_ENV === 'development' ? (kvError instanceof Error ? kvError.message : 'Unknown error') : undefined
      });
    }
  } catch (error) {
    console.error('[Orders GET] Error fetching orders:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al obtener los pedidos',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
