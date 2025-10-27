import { Resend } from 'resend';
import { setCorsHeaders, handleCorsOptions } from './_cors.js';
import { rateLimit } from './_rateLimit.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  
  if (handleCorsOptions(req, res)) {
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimit(req, res, { maxRequests: 3 })) {
    return;
  }

  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son requeridos' });
    }

    if (typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid input format' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
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
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Send Verification] Error:', error);
    return res.status(500).json({ 
      error: 'Error al enviar el correo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
