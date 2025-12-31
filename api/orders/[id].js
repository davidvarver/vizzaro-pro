import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { requireAdmin } from '../_authMiddleware.js';
import { KV_REST_API_URL, KV_REST_API_TOKEN } from '../config.js';

export default async function handler(req, res) {
    setCorsHeaders(req, res);

    if (handleCorsOptions(req, res)) return;

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Missing Order ID' });
    }

    // Security Check
    const adminUser = requireAdmin(req, res);
    if (!adminUser) return;

    if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
        return res.status(500).json({ success: false, error: 'Database config missing' });
    }

    try {
        const orderKey = `order:${id}`;

        if (req.method === 'GET') {
            const response = await fetch(`${KV_REST_API_URL}/get/${orderKey}`, {
                headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
            });

            if (!response.ok) throw new Error('KV Error');
            const { result } = await response.json();

            if (!result) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });

            const order = typeof result === 'string' ? JSON.parse(result) : result;
            return res.status(200).json({ success: true, order });
        }

        if (req.method === 'PATCH') {
            // Limited update (status, etc)
            const updates = req.body;

            // 1. Get existing
            const getRes = await fetch(`${KV_REST_API_URL}/get/${orderKey}`, {
                headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
            });
            const { result } = await getRes.json();
            if (!result) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });

            const currentOrder = typeof result === 'string' ? JSON.parse(result) : result;

            // 2. Merge updates
            const updatedOrder = {
                ...currentOrder,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            // 3. Save
            await fetch(`${KV_REST_API_URL}/set/${orderKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
                body: JSON.stringify(updatedOrder)
            });

            return res.status(200).json({ success: true, order: updatedOrder });
        }

        return res.status(405).json({ success: false, error: 'Method not allowed' });

    } catch (error) {
        console.error(`[Order API] Error handling order ${id}:`, error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}
