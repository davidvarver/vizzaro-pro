import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { ADMIN_SECRET_TOKEN } from '../config.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handleCorsOptions(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }

  try {
    const { email, secretKey } = req.body;

    // Centralized secret check
    const MAKE_ADMIN_SECRET = ADMIN_SECRET_TOKEN;

    if (secretKey !== MAKE_ADMIN_SECRET) {
      return res.status(403).json({ success: false, error: 'Acceso denegado' });
    }

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requerido' });
    }

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';

    if (!kvConfigured) {
      console.warn('[Make Admin] KV not configured properly');
      return res.status(503).json({
        error: 'Base de datos no configurada',
        needsConfig: true
      });
    }

    const userKey = `user:${email}`;
    console.log('[Make Admin] Fetching user:', userKey);

    const getResponse = await fetch(`${kvUrl}/get/${userKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    if (!getResponse.ok) {
      console.log('[Make Admin] User not found:', email);
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
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
      console.error('[Make Admin] Error parsing user data:', parseError);
      return res.status(500).json({ success: false, error: 'Error al procesar datos del usuario' });
    }

    if (!user) {
      console.log('[Make Admin] Invalid user data for:', email);
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    user.isAdmin = true;

    console.log('[Make Admin] Updating user to admin:', userKey);
    const updateResponse = await fetch(`${kvUrl}/set/${userKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[Make Admin] KV API error:', updateResponse.status, errorText);
      throw new Error(`KV API error: ${updateResponse.status} - ${errorText}`);
    }

    console.log('[Make Admin] User updated successfully:', email);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: `Usuario ${email} ahora es administrador`
    });
  } catch (error) {
    console.error('[Make Admin] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
