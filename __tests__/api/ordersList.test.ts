// __tests__/api/ordersList.test.ts
import handler from '../../api/orders/list';
import { requireAdmin } from '../../api/_authMiddleware';
import { setCorsHeaders, handleCorsOptions } from '../../api/_cors';

// Mock dependencies
jest.mock('../../api/_authMiddleware', () => ({
    requireAdmin: jest.fn(),
}));

jest.mock('../../api/_cors', () => ({
    setCorsHeaders: jest.fn(),
    handleCorsOptions: jest.fn(() => false),
}));

jest.mock('../../api/config', () => ({
    KV_REST_API_URL: 'https://mock-kv.com',
    KV_REST_API_TOKEN: 'mock-token',
}));

describe('API: /api/orders/list', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        req = {
            method: 'GET',
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    test('returns 405 if method is not GET', async () => {
        req.method = 'POST';
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    test('returns error if not admin', async () => {
        (requireAdmin as jest.Mock).mockReturnValue(false); // Auth failed
        await handler(req, res);
        // requireAdmin usually handles response if failed, 
        // but the handler code checks: if (!adminUser) return;
        // So handler should return undefined.
        // We expect requireAdmin to have been called.
        expect(requireAdmin).toHaveBeenCalledWith(req, res);
        expect(res.status).not.toHaveBeenCalledWith(200);
    });

    test('fetches orders successfully', async () => {
        (requireAdmin as jest.Mock).mockReturnValue({ id: 'admin', isAdmin: true });

        // Mock KV responses
        // 1. lrange response (order IDs)
        // 2. mget response (order details)
        const mockOrderIds = ['101', '102'];
        const mockOrders = [
            { id: '101', createdAt: '2023-01-01', total: 100 },
            { id: '102', createdAt: '2023-01-02', total: 200 }
        ];

        global.fetch = jest.fn()
            .mockResolvedValueOnce({ // lrange response
                ok: true,
                json: async () => ({ result: mockOrderIds }),
            } as any)
            .mockResolvedValueOnce({ // mget response
                ok: true,
                json: async () => ({ result: mockOrders }), // KV REST returns JSON strings or objects? list.js checks.
                // list.js: "const { result: ordersJson } = ...; ordersJson.map..."
                // Assuming mockOrders here are ALREADY objects for simplicity or strings if needed.
                // list.js handles parsing if string.
            } as any);

        await handler(req, res);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            orders: expect.arrayContaining([
                expect.objectContaining({ id: '101' }),
                expect.objectContaining({ id: '102' })
            ]),
        }));
    });

    test('handles empty order list', async () => {
        (requireAdmin as jest.Mock).mockReturnValue({ id: 'admin', isAdmin: true });

        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ result: [] }), // No orders
            } as any);

        await handler(req, res);

        expect(global.fetch).toHaveBeenCalledTimes(1); // Only checked list
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, orders: [] });
    });
});
