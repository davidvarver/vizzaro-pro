export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      console.log('[Orders GET] Fetching from KV REST API...');
      const kvResponse = await fetch(`${kvUrl}/get/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
        },
      });

      if (kvResponse.ok) {
        const kvData = await kvResponse.json();
        console.log('[Orders GET] KV response:', kvData);
        const rawResult = kvData.result;
        
        let orders = null;
        if (rawResult && typeof rawResult === 'string') {
          orders = JSON.parse(rawResult);
        } else if (rawResult && typeof rawResult === 'object') {
          orders = rawResult;
        }
        
        console.log('[Orders GET] KV fetch successful, orders exist:', !!orders);
        console.log('[Orders GET] Orders count:', Array.isArray(orders) ? orders.length : 0);
        
        return res.status(200).json({ 
          success: true, 
          orders: orders || [],
          timestamp: Date.now(),
          usingKV: true
        });
      } else {
        const errorText = await kvResponse.text();
        console.warn('[Orders GET] KV returned error:', kvResponse.status, errorText);
        
        return res.status(200).json({ 
          success: true, 
          orders: [],
          timestamp: Date.now(),
          usingKV: true
        });
      }
    } catch (kvError) {
      console.error('[Orders GET] KV error:', kvError);
      return res.status(500).json({ 
        error: 'Error al obtener los pedidos',
        details: kvError instanceof Error ? kvError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('[Orders GET] Error fetching orders:', error);
    return res.status(500).json({ 
      error: 'Error al obtener los pedidos',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
