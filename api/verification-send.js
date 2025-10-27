import { Resend } from 'resend';
import { setCorsHeaders, handleCorsOptions } from './_cors.js';
import { rateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', allowedMethods: ['POST', 'OPTIONS'] });
  }

  if (rateLimit(req, res, { maxRequests: 3 })) {
    return;
  }

  try {
    const { email, code } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requerido' });
    }

    if (!code) {
      return res.status(400).json({ success: false, error: 'Código requerido' });
    }

    if (typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email debe ser un string' });
    }

    if (typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Código debe ser un string' });
    }

    if (code.length !== 6) {
      return res.status(400).json({ success: false, error: 'El código debe tener 6 caracteres' });
    }

    if (!/^\d+$/.test(code)) {
      return res.status(400).json({ success: false, error: 'El código debe contener solo números' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Email inválido' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 'your_resend_api_key') {
      console.error('[Send Verification] RESEND_API_KEY not configured');
      return res.status(503).json({ 
        error: '⚠️ Servicio de email no configurado',
        needsConfig: true 
      });
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Código de verificación - Vizzaro Wallpaper',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Código de verificación</h2>
          <p>Tu código de verificación es:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
            ${code}
          </div>
          <p>Este código expirará en 10 minutos.</p>
          <p>Si no solicitaste este código, puedes ignorar este correo.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Send Verification] Resend error:', error);
      return res.status(400).json({ success: false, error: error.message || 'Error al enviar el correo' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Send Verification] Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al enviar el correo',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
