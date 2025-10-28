import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vizzaro_jwt_secret_change_in_production_2025';

export function verifyToken(req, res) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return { 
        success: false, 
        error: 'No autorizado - Token no proporcionado',
        statusCode: 401 
      };
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { 
        success: true, 
        user: decoded 
      };
    } catch (jwtError) {
      console.error('[Auth Middleware] JWT verification failed:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return { 
          success: false, 
          error: 'Token expirado - Por favor inicia sesión nuevamente',
          statusCode: 401 
        };
      }
      
      return { 
        success: false, 
        error: 'Token inválido',
        statusCode: 401 
      };
    }
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return { 
      success: false, 
      error: 'Error de autenticación',
      statusCode: 500 
    };
  }
}

export function requireAuth(req, res) {
  const authResult = verifyToken(req, res);
  
  if (!authResult.success) {
    res.status(authResult.statusCode || 401).json({ 
      success: false, 
      error: authResult.error 
    });
    return null;
  }
  
  return authResult.user;
}

export function requireAdmin(req, res) {
  const authResult = verifyToken(req, res);
  
  if (!authResult.success) {
    res.status(authResult.statusCode || 401).json({ 
      success: false, 
      error: authResult.error 
    });
    return null;
  }
  
  const user = authResult.user;
  
  if (!user.isAdmin) {
    res.status(403).json({ 
      success: false, 
      error: 'Acceso denegado - Se requieren permisos de administrador' 
    });
    return null;
  }
  
  return user;
}

export function verifyAdmin(req, res) {
  const { adminToken } = req.body;
  
  const expectedToken = process.env.ADMIN_SECRET_TOKEN || 
                        process.env.EXPO_PUBLIC_ADMIN_TOKEN || 
                        'vizzaro_admin_secret_2025';

  if (!adminToken) {
    return {
      success: false,
      error: 'No autorizado - Token de admin no proporcionado',
      statusCode: 401
    };
  }

  if (adminToken !== expectedToken) {
    return {
      success: false,
      error: 'No autorizado - Token de admin inválido',
      statusCode: 403
    };
  }

  return { success: true };
}
