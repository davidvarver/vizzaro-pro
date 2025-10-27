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
    const { email, password, name } = req.body;

    console.log('[Users REGISTER] Received request for:', email);

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
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

    const userKey = `user:${email}`;
    console.log('[Users REGISTER] Checking if user exists:', userKey);
    
    const existingUserResponse = await fetch(`${kvUrl}/get/${userKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    if (existingUserResponse.ok) {
      const existingData = await existingUserResponse.json();
      if (existingData.result) {
        console.log('[Users REGISTER] User already exists:', email);
        return res.status(400).json({ error: 'Este correo ya está registrado' });
      }
    }

    console.log('[Users REGISTER] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
      id: Date.now().toString(),
      email,
      passwordHash: hashedPassword,
      name,
      createdAt: new Date().toISOString(),
    };
    
    console.log('[Users REGISTER] Saving to KV with key:', userKey);
    const kvResponse = await fetch(`${kvUrl}/set/${userKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error('[Users REGISTER] KV API error:', kvResponse.status, errorText);
      throw new Error(`KV API error: ${kvResponse.status} - ${errorText}`);
    }

    console.log('[Users REGISTER] Adding to users index...');
    const usersIndexResponse = await fetch(`${kvUrl}/get/users:index`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    let usersList = [];
    if (usersIndexResponse.ok) {
      const indexData = await usersIndexResponse.json();
      const rawResult = indexData.result;
      try {
        if (rawResult && typeof rawResult === 'string') {
          usersList = JSON.parse(rawResult);
        } else if (rawResult && typeof rawResult === 'object') {
          usersList = rawResult;
        }
      } catch (parseError) {
        console.error('[Users REGISTER] Error parsing users index:', parseError);
        usersList = [];
      }
    }

    if (!Array.isArray(usersList)) {
      usersList = [];
    }

    if (!usersList.includes(email)) {
      usersList.push(email);
      await fetch(`${kvUrl}/set/users:index`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(usersList),
      });
    }

    console.log('[Users REGISTER] User registered successfully:', newUser.id);
    
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    
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
