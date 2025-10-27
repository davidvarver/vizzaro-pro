export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order } = req.body;

    console.log('[Orders CREATE] Received request');
    console.log('[Orders CREATE] Order data:', order);

    if (!order) {
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

    console.log('[Orders CREATE] Fetching existing orders...');
    const getResponse = await fetch(`${kvUrl}/get/orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    let orders = [];
    if (getResponse.ok) {
      const getData = await getResponse.json();
      const rawResult = getData.result;
      if (rawResult && typeof rawResult === 'string') {
        orders = JSON.parse(rawResult);
      } else if (rawResult && typeof rawResult === 'object') {
        orders = rawResult;
      }
    }
    
    console.log('[Orders CREATE] Current orders count:', Array.isArray(orders) ? orders.length : 0);
    
    const newOrder = {
      ...order,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    orders = [newOrder, ...(Array.isArray(orders) ? orders : [])];
    
    console.log('[Orders CREATE] Saving to KV with', orders.length, 'orders...');
    const kvResponse = await fetch(`${kvUrl}/set/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orders),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error('[Orders CREATE] KV API error:', kvResponse.status, errorText);
      throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
    }

    console.log('[Orders CREATE] Order created successfully:', newOrder.id);
    
    return res.status(200).json({ 
      success: true,
      orderId: newOrder.id,
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
