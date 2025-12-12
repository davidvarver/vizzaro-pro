import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
import { validateRequest, userLoginSchema } from '../_schemas.js';
import { JWT_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN } from '../config.js';
import logger from '../logger.js';
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
    logger.info('[Users LOGIN] Received request');

    const validation = validateRequest(userLoginSchema, req.body);
    if (!validation.success) {
      logger.warn('[Users LOGIN] Validation failed:', validation.errors);
      return res.status(422).json({
        success: false,
        error: 'Datos inválidos',
        validationErrors: validation.errors
      });
    }

    const { email, password } = validation.data;

    // Use centralized config
    const kvUrl = KV_REST_API_URL;
    const kvToken = KV_REST_API_TOKEN;

    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';

    if (!kvConfigured) {
      logger.warn('[Users LOGIN] KV not configured properly');
      return res.status(503).json({
        error: '⚠️ Base de datos no configurada',
        needsConfig: true
      });
    }

    const userKey = `user:${email}`;
    logger.debug('[Users LOGIN] Fetching user:', userKey);

    const getResponse = await fetch(`${kvUrl}/get/${userKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    if (!getResponse.ok) {
      logger.info('[Users LOGIN] User not found:', email);
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
      logger.error('[Users LOGIN] Error parsing user data:', parseError);
      return res.status(500).json({ success: false, error: 'Error al procesar datos del usuario' });
    }

    if (!user || !user.passwordHash) {
      logger.warn('[Users LOGIN] Invalid user data for:', email);
      return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos' });
    }

    logger.debug('[Users LOGIN] Comparing passwords...');
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      logger.info('[Users LOGIN] Invalid password for:', email);
      return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos' });
    }

    logger.debug('[Users LOGIN] Generating JWT token...');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin || false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    logger.info('[Users LOGIN] User logged in successfully:', user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      token,
      user: userWithoutPassword,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    logger.error('[Users LOGIN] Error logging in:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
