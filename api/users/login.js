import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vizzaro_jwt_secret_change_in_production_2025';
const JWT_EXPIRATION = '7d';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }

  if (rateLimit(req, res, { maxRequests: 5 })) {
    return;
  }

  try {
    const { email, password } = req.body;

    console.log('[Users LOGIN] Received request for:', email);

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requerido' });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: 'Contraseña requerida' });
    }

    if (typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email debe ser un string' });
    }

    if (typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Contraseña debe ser un string' });
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
      return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos' });
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
      return res.status(500).json({ success: false, error: 'Error al procesar datos del usuario' });
    }

    if (!user || !user.passwordHash) {
      console.log('[Users LOGIN] Invalid user data for:', email);
      return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos' });
    }
    
    console.log('[Users LOGIN] Comparing passwords...');
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      console.log('[Users LOGIN] Invalid password for:', email);
      return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos' });
    }
    
    console.log('[Users LOGIN] Generating JWT token...');
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
    
    console.log('[Users LOGIN] User logged in successfully:', user.id);
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({ 
      success: true,
      token,
      user: userWithoutPassword,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    console.error('[Users LOGIN] Error logging in:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al iniciar sesión',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
