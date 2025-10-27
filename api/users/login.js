import bcrypt from 'bcryptjs';

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
    const { email, password } = req.body;

    console.log('[Users LOGIN] Received request for:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Users LOGIN] KV not configured properly');
      return res.status(503).json({ 
        error: '⚠️ Base de datos no configurada',
        needsConfig: true
      });
    }

    const userKey = `user:${email}`;
    console.log('[Users LOGIN] Fetching user:', userKey);
    
    const getResponse = await fetch(`${kvUrl}/get/${userKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    if (!getResponse.ok) {
      console.log('[Users LOGIN] User not found:', email);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const userData = await getResponse.json();
    let user = null;

    try {
      const rawResult = userData.result;
      if (rawResult && typeof rawResult === 'string') {
        user = JSON.parse(rawResult);
      } else if (rawResult && typeof rawResult === 'object') {
        user = rawResult;
      }
    } catch (parseError) {
      console.error('[Users LOGIN] Error parsing user data:', parseError);
      return res.status(500).json({ error: 'Error al procesar datos del usuario' });
    }

    if (!user || !user.passwordHash) {
      console.log('[Users LOGIN] Invalid user data for:', email);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    
    console.log('[Users LOGIN] Comparing passwords...');
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      console.log('[Users LOGIN] Invalid password for:', email);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    
    console.log('[Users LOGIN] User logged in successfully:', user.id);
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({ 
      success: true,
      user: userWithoutPassword,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    console.error('[Users LOGIN] Error logging in:', error);
    return res.status(500).json({ 
      error: 'Error al iniciar sesión',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
