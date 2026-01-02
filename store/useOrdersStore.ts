import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from './useCartStore';
import { useAuthStore } from './useAuthStore';

// Re-export Order interface for compatibility
export interface Order {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
    items: CartItem[];
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    deliveryMethod: 'pickup' | 'delivery';
    notes?: string;
    createdAt: string;
    updatedAt: string;
    paymentMethod?: 'zelle' | 'credit_card';
    paymentReference?: string;
    zelleConfirmed?: boolean;
    zelleConfirmedAt?: string;
    zelleConfirmedBy?: string;
}

interface OrdersState {
    orders: Order[];
    isLoading: boolean;

    // Actions
    initialize: () => Promise<void>;
    loadOrders: () => Promise<void>;
    createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
    updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
    updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    getOrdersByStatus: (status: Order['status']) => Order[];
    getOrderStats: () => {
        total: number;
        pending: number;
        confirmed: number;
        preparing: number;
        ready: number;
        delivered: number;
        cancelled: number;
        totalRevenue: number;
    };
}

const ORDERS_STORAGE_KEY = 'wallpaper_orders';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Helper to get API URL consistently
function getApiBaseUrl(): string {
    if (process.env.EXPO_PUBLIC_API_URL) {
        const url = process.env.EXPO_PUBLIC_API_URL;
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }
    return '';
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    isLoading: true,

    initialize: async () => {
        await get().loadOrders();
    },

    loadOrders: async () => {
        try {
            console.log('[useOrdersStore] Loading orders...');
            const baseUrl = getApiBaseUrl();

            if (baseUrl) {
                try {
                    console.log('[useOrdersStore] Fetching from API:', `${baseUrl}/api/orders/get`);
                    const response = await fetch(`${baseUrl}/api/orders/get?t=${Date.now()}`, {
                        method: 'GET',
                        headers: {
                            'Cache-Control': 'no-store, no-cache, must-revalidate',
                            'Pragma': 'no-cache',
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('[useOrdersStore] Loaded from API:', data.orders?.length || 0, 'orders');
                        if (data.success && data.orders) {
                            set({ orders: data.orders, isLoading: false });
                            await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(data.orders));
                            return;
                        }
                    } else {
                        console.warn('[useOrdersStore] API returned error:', response.status);
                    }
                } catch (apiError) {
                    console.warn('[useOrdersStore] API fetch failed, trying local storage:', apiError);
                }
            }

            console.log('[useOrdersStore] Loading from local storage...');
            const stored = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('[useOrdersStore] Loaded from storage:', parsed.length, 'orders');
                set({ orders: parsed, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('[useOrdersStore] Error loading orders:', error);
            set({ isLoading: false });
        }
    },

    createOrder: async (orderData) => {
        try {
            console.log('[useOrdersStore] Creating order...');
            const baseUrl = getApiBaseUrl();

            if (baseUrl) {
                try {
                    const response = await fetch(`${baseUrl}/api/orders/create`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ order: orderData }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('[useOrdersStore] Order created via API:', data.orderId);

                        if (data.success && data.order) {
                            set(state => ({ orders: [data.order, ...state.orders] }));
                            // Email sending logic is likely handled by the API in a robust setup,
                            // but migrating the frontend email logic here as per context requires careful handling.
                            // For now, assume API handles email or we invoke it here if needed.
                            // The Context implementation called `sendOrderConfirmationEmail` locally.
                            // We will replicate that local helper internally.
                            await sendOrderConfirmationEmail(data.order);
                            return data.orderId;
                        }
                    } else {
                        console.warn('[useOrdersStore] API create failed:', response.status);
                    }
                } catch (apiError) {
                    console.warn('[useOrdersStore] API create error, falling back to local:', apiError);
                }
            }

            const newOrder: Order = {
                ...orderData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            set(state => ({ orders: [newOrder, ...state.orders] }));
            await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([newOrder, ...get().orders]));
            await sendOrderConfirmationEmail(newOrder);

            return newOrder.id;
        } catch (error) {
            console.error('[useOrdersStore] Error creating order:', error);
            throw error;
        }
    },

    updateOrderStatus: async (orderId, status) => {
        try {
            console.log('[useOrdersStore] Updating order status:', orderId, status);
            const baseUrl = getApiBaseUrl();
            const adminToken = useAuthStore.getState().token; // Access token directly

            if (baseUrl && adminToken) {
                try {
                    const response = await fetch(`${baseUrl}/api/orders/update`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId,
                            updates: { status },
                            adminToken
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('[useOrdersStore] Order updated via API');
                        if (data.success && data.order) {
                            set(state => ({
                                orders: state.orders.map(order => order.id === orderId ? data.order : order)
                            }));
                            await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(get().orders));
                            return;
                        }
                    }
                } catch (apiError) {
                    console.warn('[useOrdersStore] API update failed:', apiError);
                }
            }

            set(state => ({
                orders: state.orders.map(order =>
                    order.id === orderId
                        ? { ...order, status, updatedAt: new Date().toISOString() }
                        : order
                )
            }));
            await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(get().orders));
        } catch (error) {
            console.error('[useOrdersStore] Error updating order status:', error);
        }
    },

    updateOrder: async (orderId, updates) => {
        try {
            console.log('[useOrdersStore] Updating order:', orderId);
            const baseUrl = getApiBaseUrl();
            const adminToken = useAuthStore.getState().token;

            if (baseUrl && adminToken) {
                try {
                    const response = await fetch(`${baseUrl}/api/orders/update`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ orderId, updates, adminToken }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('[useOrdersStore] Order updated via API');
                        if (data.success && data.order) {
                            set(state => ({
                                orders: state.orders.map(order => order.id === orderId ? data.order : order)
                            }));
                            await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(get().orders));
                            return;
                        }
                    }
                } catch (apiError) {
                    console.warn('[useOrdersStore] API update failed:', apiError);
                }
            }

            set(state => ({
                orders: state.orders.map(order =>
                    order.id === orderId
                        ? { ...order, ...updates, updatedAt: new Date().toISOString() }
                        : order
                )
            }));
            await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(get().orders));
        } catch (error) {
            console.error('[useOrdersStore] Error updating order:', error);
        }
    },

    deleteOrder: async (orderId) => {
        try {
            console.log('[useOrdersStore] Deleting order:', orderId);
            const baseUrl = getApiBaseUrl();
            const adminToken = useAuthStore.getState().token;

            if (baseUrl && adminToken) {
                try {
                    const response = await fetch(`${baseUrl}/api/orders/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ orderId, adminToken }),
                    });

                    if (response.ok) {
                        console.log('[useOrdersStore] Order deleted via API');
                        set(state => ({ orders: state.orders.filter(order => order.id !== orderId) }));
                        await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(get().orders));
                        return;
                    }
                } catch (apiError) {
                    console.warn('[useOrdersStore] API delete failed:', apiError);
                }
            }

            set(state => ({ orders: state.orders.filter(order => order.id !== orderId) }));
            await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(get().orders));
        } catch (error) {
            console.error('[useOrdersStore] Error deleting order:', error);
        }
    },

    getOrdersByStatus: (status) => {
        return get().orders.filter(order => order.status === status);
    },

    getOrderStats: () => {
        const orders = get().orders;
        const stats = {
            total: orders.length,
            pending: 0,
            confirmed: 0,
            preparing: 0,
            ready: 0,
            delivered: 0,
            cancelled: 0,
            totalRevenue: 0,
        };

        orders.forEach(order => {
            if (stats[order.status] !== undefined) {
                stats[order.status]++;
            }
            if (order.status === 'delivered') {
                stats.totalRevenue += order.total;
            }
        });

        return stats;
    }
}));

// Helper function for email (internal use)
const sendOrderConfirmationEmail = async (order: Order): Promise<void> => {
    try {
        const emailApiUrl = process.env.EXPO_PUBLIC_EMAIL_API_URL;
        const emailApiKey = process.env.EXPO_PUBLIC_EMAIL_API_KEY;
        const fromEmail = process.env.EXPO_PUBLIC_FROM_DEFAULT;

        if (!emailApiUrl || !emailApiKey || !fromEmail) {
            console.log('⚠️ Email API no configurada. Orden creada sin email de confirmación.');
            return;
        }

        const itemsHtml = order.items.map(item => `
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">${item.wallpaper.name}</div>
            <div style="color: #999999; font-size: 13px;">${item.wallpaper.style}</div>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #e5e5e5; text-align: center; color: #666666;">${item.rollsNeeded} rollos</td>
          <td style="padding: 15px; border-bottom: 1px solid #e5e5e5; text-align: right; color: #1a1a1a; font-weight: 600;">${(item.wallpaper.price * item.rollsNeeded).toFixed(2)}</td>
        </tr>
      `).join('');

        const response = await fetch(emailApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${emailApiKey}`,
            },
            body: JSON.stringify({
                from: fromEmail,
                to: order.customerEmail,
                subject: `Confirmación de Pedido #${order.id} - Vizzaro Wallpaper`,
                html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <tr>
                          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Vizzaro Wallpaper</h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 40px 30px;">
                            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 30px;">
                              <div style="color: #166534; font-size: 18px; font-weight: 600; margin-bottom: 4px;">✓ Pedido Confirmado</div>
                              <div style="color: #15803d; font-size: 14px;">Gracias por tu compra, ${order.customerName}</div>
                            </div>
                            
                            <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">Detalles del Pedido</h2>
                            
                            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="padding-bottom: 8px; color: #666666; font-size: 14px;">Número de Pedido:</td>
                                  <td style="padding-bottom: 8px; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 14px;">#${order.id}</td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 8px; color: #666666; font-size: 14px;">Fecha:</td>
                                  <td style="padding-bottom: 8px; text-align: right; color: #1a1a1a; font-size: 14px;">${new Date(order.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 8px; color: #666666; font-size: 14px;">Método de Entrega:</td>
                                  <td style="padding-bottom: 8px; text-align: right; color: #1a1a1a; font-size: 14px;">${order.deliveryMethod === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda'}</td>
                                </tr>
                                ${order.deliveryMethod === 'delivery' ? `
                                <tr>
                                  <td style="color: #666666; font-size: 14px;">Dirección:</td>
                                  <td style="text-align: right; color: #1a1a1a; font-size: 14px;">${order.customerAddress}</td>
                                </tr>
                                ` : ''}
                              </table>
                            </div>

                            <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">Productos</h3>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                              <thead>
                                <tr style="background-color: #f8f9fa;">
                                  <th style="padding: 12px 15px; text-align: left; color: #666666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Producto</th>
                                  <th style="padding: 12px 15px; text-align: center; color: #666666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Cant.</th>
                                  <th style="padding: 12px 15px; text-align: right; color: #666666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Precio</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${itemsHtml}
                              </tbody>
                            </table>

                            <div style="background-color: #667eea; border-radius: 8px; padding: 20px; text-align: right;">
                              <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 8px;">Total</div>
                              <div style="color: #ffffff; font-size: 32px; font-weight: 700;">${order.total.toFixed(2)}</div>
                            </div>
                            
                            ${order.paymentMethod === 'zelle' && order.paymentReference ? `
                            <div style="margin-top: 30px; padding: 20px; background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                              <div style="color: #92400e; font-size: 16px; font-weight: 600; margin-bottom: 12px;">💳 Instrucciones para Pago con Zelle</div>
                              <div style="background-color: #ffffff; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                                <div style="color: #78350f; font-size: 14px; margin-bottom: 8px;"><strong>Envía tu pago a:</strong></div>
                                <div style="color: #1a1a1a; font-size: 18px; font-weight: 700; margin-bottom: 16px;">7326646800</div>
                                <div style="color: #78350f; font-size: 14px; margin-bottom: 8px;"><strong>Monto total:</strong></div>
                                <div style="color: #1a1a1a; font-size: 18px; font-weight: 700; margin-bottom: 16px;">${order.total.toFixed(2)}</div>
                                <div style="background-color: #FEF3C7; border-radius: 6px; padding: 12px; border: 2px dashed #F59E0B;">
                                  <div style="color: #92400e; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Código de Referencia:</div>
                                  <div style="color: #1a1a1a; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${order.paymentReference}</div>
                                </div>
                              </div>
                              <div style="background-color: #FEE2E2; border-radius: 6px; padding: 12px; border-left: 4px solid #EF4444;">
                                <div style="color: #991B1B; font-size: 14px; font-weight: 600; margin-bottom: 4px;">⚠️ MUY IMPORTANTE</div>
                                <div style="color: #7F1D1D; font-size: 13px; line-height: 1.6;">
                                  Debes incluir el código de referencia <strong>${order.paymentReference}</strong> en la nota o descripción de tu pago Zelle. Esto nos permite identificar y procesar tu pedido automáticamente.
                                </div>
                              </div>
                            </div>
                            ` : ''}

                            ${order.notes ? `
                            <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px;">
                              <div style="color: #92400e; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Notas del pedido:</div>
                              <div style="color: #78350f; font-size: 14px;">${order.notes}</div>
                            </div>
                            ` : ''}

                            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                              <p style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">¿Necesitas ayuda?</p>
                              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                Contáctanos por WhatsApp al <a href="https://wa.me/17326646800" style="color: #667eea; text-decoration: none; font-weight: 600;">+1 (732) 664-6800</a>
                              </p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">© ${new Date().getFullYear()} Vizzaro Wallpaper. Todos los derechos reservados.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,
            }),
        });

        if (!response.ok) {
            throw new Error('Error al enviar email de confirmación');
        }

        console.log('✅ Email de confirmación enviado a:', order.customerEmail);
    } catch (error) {
        console.error('❌ Error enviando email de confirmación:', error);
    }
};
