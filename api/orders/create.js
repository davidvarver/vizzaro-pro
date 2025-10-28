import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
import { validateRequest, orderCreateSchema } from '../_schemas.js';
import { verifyToken } from '../_authMiddleware.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }

  if (rateLimit(req, res, { maxRequests: 10 })) {
    return;
  }

  try {
    console.log('[Orders CREATE] Received request');

    const authResult = verifyToken(req, res);
    if (!authResult.success) {
      console.log('[Orders CREATE] Auth failed:', authResult.error);
      return res.status(authResult.statusCode || 401).json({ 
        success: false, 
        error: authResult.error 
      });
    }

    const validation = validateRequest(orderCreateSchema, req.body);
    if (!validation.success) {
      console.log('[Orders CREATE] Validation failed:', validation.errors);
      return res.status(422).json({ 
        success: false, 
        error: 'Datos inválidos', 
        validationErrors: validation.errors 
      });
    }

    const { order } = validation.data;

    if (order.userId !== authResult.user.userId) {
      console.log('[Orders CREATE] User mismatch');
      return res.status(403).json({ 
        success: false, 
        error: 'No puedes crear pedidos para otro usuario' 
      });
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

    console.log('[Orders CREATE] Adding order to user index...');
    const userIndexKey = `orders:user:${order.userId}`;
    
    const userIndexResponse = await fetch(`${kvUrl}/lpush/${userIndexKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([orderId]),
    });

    if (!userIndexResponse.ok) {
      console.error('[Orders CREATE] Failed to update user index, but order was saved');
    }

    const allOrdersKey = 'orders:all';
    const allOrdersResponse = await fetch(`${kvUrl}/lpush/${allOrdersKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([orderId]),
    });

    if (!allOrdersResponse.ok) {
      console.error('[Orders CREATE] Failed to update global index, but order was saved');
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
      success: false,
      error: 'Error al crear el pedido',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
