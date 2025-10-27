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
      console.log('[Orders GET] Fetching index from KV...');
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
          console.warn('[Orders GET] Error parsing index:', parseError);
          orderIds = [];
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
