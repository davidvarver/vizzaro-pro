import { setCorsHeaders, handleCorsOptions } from '../_cors.js';
import { requireAdmin } from '../_authMiddleware.js';
import { KV_REST_API_URL, KV_REST_API_TOKEN } from '../config.js';

export default async function handler(req, res) {
    setCorsHeaders(req, res);

    if (handleCorsOptions(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Security Check
    const adminUser = requireAdmin(req, res);
    if (!adminUser) return; // Response handled by middleware

    try {
        if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
            throw new Error('KV Configuration missing');
        }

        // 1. Get all Order IDs
        const listResponse = await fetch(`${KV_REST_API_URL}/lrange/orders:all/0/-1`, {
            headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
        });

        if (!listResponse.ok) throw new Error('Failed to fetch order list');

        const { result: orderIds } = await listResponse.json();

        if (!orderIds || orderIds.length === 0) {
            return res.status(200).json({ success: true, orders: [] });
        }

        // 2. Batch get Order Details (MGET)
        // Construct keys: "order:id1", "order:id2"
        const command = ['MGET', ...orderIds.map(id => `order:${id}`)];

        const mgetResponse = await fetch(`${KV_REST_API_URL}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
            body: JSON.stringify([command])
        });

        // Note: Vercel KV REST 'pipeline' or just 'mget' endpoint specific format?
        // Using simple command endpoint for MGET might be safer if pipeline syntax varies.
        // Let's use the explicit command endpoint logic or parallel fetches if MGET is tricky via generic fetch.
        // Actually, `fetch(`${url}/mget/key1/key2`)` depends on the implementation.
        // Safest standard Redis REST: POST to / with command

        const detailsResponse = await fetch(`${KV_REST_API_URL}/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
            body: JSON.stringify(['MGET', ...orderIds.map(id => `order:${id}`)])
        });

        if (!detailsResponse.ok) throw new Error('Failed to fetch order details');

        const { result: ordersJson } = await detailsResponse.json();

        // Parse JSON strings to objects
        const orders = ordersJson
            .filter(json => json !== null)
            .map(json => {
                try {
                    return typeof json === 'string' ? JSON.parse(json) : json;
                } catch (e) {
                    return null;
                }
            })
            .filter(order => order !== null);

        // Sort by Date (Newest First)
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({ success: true, orders });

    } catch (error) {
        console.error('[Admin Orders] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al obtener pedidos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
