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
    const { email, password, name } = req.body;

    console.log('[Users REGISTER] Received request for:', email);

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name required' });
    }
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Users REGISTER] KV not configured properly');
      return res.status(503).json({ 
        error: '⚠️ Base de datos no configurada',
        needsConfig: true
      });
    }

    console.log('[Users REGISTER] Fetching existing users...');
    const getResponse = await fetch(`${kvUrl}/get/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    let users = [];
    if (getResponse.ok) {
      const getData = await getResponse.json();
      const rawResult = getData.result;
      if (rawResult && typeof rawResult === 'string') {
        users = JSON.parse(rawResult);
      } else if (rawResult && typeof rawResult === 'object') {
        users = rawResult;
      }
    }
    
    console.log('[Users REGISTER] Current users count:', Array.isArray(users) ? users.length : 0);
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      console.log('[Users REGISTER] User already exists:', email);
      return res.status(400).json({ error: 'Este correo ya está registrado' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      name,
      createdAt: new Date().toISOString(),
    };
    
    users = [...(Array.isArray(users) ? users : []), newUser];
    
    console.log('[Users REGISTER] Saving to KV with', users.length, 'users...');
    const kvResponse = await fetch(`${kvUrl}/set/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(users),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error('[Users REGISTER] KV API error:', kvResponse.status, errorText);
      throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
    }

    console.log('[Users REGISTER] User registered successfully:', newUser.id);
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    return res.status(200).json({ 
      success: true,
      user: userWithoutPassword,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    console.error('[Users REGISTER] Error registering user:', error);
    return res.status(500).json({ 
      error: 'Error al registrar usuario',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
