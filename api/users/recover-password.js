import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { rateLimit } from '../_rateLimit.js';
import { KV_REST_API_URL, KV_REST_API_TOKEN } from '../config.js';
import logger from '../logger.js';

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
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email required' });
        }

        // KV Config
        const kvUrl = KV_REST_API_URL;
        const kvToken = KV_REST_API_TOKEN;

        if (!kvUrl || !kvToken) {
            logger.error('[Recover Password] KV not configured');
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userKey = `user:${email}`;
        const userResponse = await fetch(`${kvUrl}/get/${userKey}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${kvToken}` }
        });

        if (!userResponse.ok) {
            return res.status(404).json({ success: false, error: 'Correo no registrado' });
        }

        const userData = await userResponse.json();
        let user = null;

        if (userData.result) {
            if (typeof userData.result === 'string') {
                user = JSON.parse(userData.result);
            } else {
                user = userData.result;
            }
        }

        if (!user) {
            return res.status(404).json({ success: false, error: 'Correo no registrado' });
        }

        // Generate temp password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Update user
        user.passwordHash = hashedPassword;

        // Save to KV
        const updateResponse = await fetch(`${kvUrl}/set/${userKey}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${kvToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update user in KV');
        }

        // Send Email
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey && apiKey !== 'your_resend_api_key') {
            const resend = new Resend(apiKey);
            await resend.emails.send({
                from: process.env.FROM_EMAIL_AUTH || 'onboarding@resend.dev',
                to: email,
                subject: 'Password Reset - Vizzaro Wallpaper',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset</h2>
                    <p>Your password has been reset.</p>
                    <p>Your new temporary password is:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
                        ${tempPassword}
                    </div>
                    <p>Please log in and change your password immediately.</p>
                </div>
            `
            });
        } else {
            logger.warn('[Recover Password] Resend API key missing, printing to console');
            console.log(`[DEV MODE] Password for ${email}: ${tempPassword}`);
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        logger.error('[Recover Password] Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
