import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
import { validateRequest, userRegisterSchema } from '../_schemas.js';

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
    console.log('[Users REGISTER] Received request');

    const validation = validateRequest(userRegisterSchema, req.body);
    if (!validation.success) {
      console.log('[Users REGISTER] Validation failed:', validation.errors);
      return res.status(422).json({ 
        success: false, 
        error: 'Datos inválidos', 
        validationErrors: validation.errors 
      });
    }

    const { email, password, name } = validation.data;
    
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
        return res.status(400).json({ success: false, error: 'Este correo ya está registrado' });
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

    console.log('[Users REGISTER] Generating JWT token...');
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        name: newUser.name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    console.log('[Users REGISTER] User registered successfully:', newUser.id);
    
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    
    return res.status(200).json({ 
      success: true,
      token,
      user: userWithoutPassword,
      timestamp: Date.now(),
      usingKV: true
    });
  } catch (error) {
    console.error('[Users REGISTER] Error registering user:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al registrar usuario',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
