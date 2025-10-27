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
    const { orderId, adminToken } = req.body;

    console.log('[Orders DELETE] Received request');
    console.log('[Orders DELETE] Order ID:', orderId);
    console.log('[Orders DELETE] Admin token provided:', !!adminToken);

    const expectedToken = process.env.ADMIN_SECRET_TOKEN || process.env.EXPO_PUBLIC_ADMIN_TOKEN || 'vizzaro_admin_secret_2025';

    if (!adminToken || adminToken !== expectedToken) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID required' });
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

    console.log('[Orders DELETE] Fetching existing orders...');
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
    
    console.log('[Orders DELETE] Current orders count:', Array.isArray(orders) ? orders.length : 0);
    
    orders = orders.filter(o => o.id !== orderId);
    
    console.log('[Orders DELETE] Saving to KV with', orders.length, 'orders...');
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
      console.error('[Orders DELETE] KV API error:', kvResponse.status, errorText);
      throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
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
      error: 'Error al eliminar el pedido',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
