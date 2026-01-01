import { put } from '@vercel/blob';
import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { requireAdmin } from '../_authMiddleware.js';

export const config = {
    api: {
        bodyParser: false, // Blob requires raw body for streaming uploads if using handleUpload, but 'put' usually handles buffers.
        // However, for simple client-side calls we might prefer standard upload or handleUpload.
        // Let's use the simplest flow: authenticated admin sends file buffer.
        // Or even better: Client-side upload with server-side token generation?
        // For Vercel Blob, the standard secure way is often server-side upload.
    },
};

export default async function handler(req, res) {
    setCorsHeaders(req, res);
    if (handleCorsOptions(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Security Check
    const adminUser = requireAdmin(req, res);
    if (!adminUser) return; // requireAdmin handles response

    // Check for BLOB_READ_WRITE_TOKEN
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('BLOB_READ_WRITE_TOKEN is not defined');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const filename = req.query.filename || 'image-' + Date.now();

        // We expect the file content in the body.
        // If the body is a stream or buffer, 'put' can simple take it.
        // Note: If using bodyParser: false, req is the stream.

        // Using @vercel/blob 'put'
        const blob = await put(filename, req.body, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN, // Explicitly pass token if needed, usually auto-picked up
        });

        return res.status(200).json(blob);
    } catch (error) {
        console.error('Blob Upload Error:', error);
        return res.status(500).json({ error: 'Error uploading file', details: error.message });
    }
}
