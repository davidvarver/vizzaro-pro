import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallpaper } from '@/constants/wallpapers';

export interface CartItem {
    id: string; // Unique Cart Item ID (e.g. wallpaperId_sample)
    wallpaperId: string; // Original Wallpaper ID for reference/links
    wallpaper: Wallpaper;
    quantity: number;
    rollsNeeded: number;
    wallArea: number;
    purchaseType: 'roll' | 'measurement' | 'sample';
}

interface CartState {
    cartItems: CartItem[];
    isLoading: boolean;

    // Actions
    addToCart: (wallpaper: Wallpaper, rollsNeeded?: number, wallArea?: number, purchaseType?: 'roll' | 'measurement' | 'sample') => void;
    updateQuantity: (id: string, change: number) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    initialize: () => Promise<void>;

    // Getters
    getSubtotal: () => number;
    getShippingCost: () => number;
    getGrandTotal: () => number;
    getCartItemsCount: () => number;
    isInCart: (wallpaperId: string) => boolean;

    // Deprecated alias for compatibility (maps to getSubtotal)
    getCartTotal: () => number;
}

const CART_STORAGE_KEY = 'wallpaper_cart';

export const useCartStore = create<CartState>((set, get) => ({
    cartItems: [],
    isLoading: true,

    initialize: async () => {
        try {
            const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                // Migration support: old items might have id=wallpaperId. 
                // We should sanitize or just load.
                const items = JSON.parse(stored);
                // Basic cleanup if needed
                const validatedItems = items.map((item: any) => ({
                    ...item,
                    wallpaperId: item.wallpaperId || item.wallpaper?.id || item.id, // Ensure wallpaperId exists
                    purchaseType: item.purchaseType || 'roll'
                }));
                set({ cartItems: validatedItems, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            set({ isLoading: false });
        }
    },

    addToCart: (wallpaper, rollsNeeded = 1, wallArea = 5.33, purchaseType = 'roll') => {
        set((state) => {
            // Generate a simpler unique Key for this item configuration
            const compositeId = `${wallpaper.id}_${purchaseType}`;

            const existingItemIndex = state.cartItems.findIndex(item => item.id === compositeId);
            let newItems;

            if (existingItemIndex > -1) {
                const item = state.cartItems[existingItemIndex];

                // For 'roll' and 'measurement', we aggregate quantity/rolls.
                // For 'sample', we just aggregate quantity.

                const updatedItem = {
                    ...item,
                    quantity: item.quantity + 1,
                    rollsNeeded: purchaseType === 'sample' ? 0 : item.rollsNeeded + rollsNeeded,
                    wallArea: purchaseType === 'sample' ? 0 : item.wallArea + wallArea
                };

                newItems = [...state.cartItems];
                newItems[existingItemIndex] = updatedItem;
            } else {
                const newItem: CartItem = {
                    id: compositeId,
                    wallpaperId: wallpaper.id,
                    wallpaper,
                    quantity: 1,
                    rollsNeeded: purchaseType === 'sample' ? 0 : rollsNeeded,
                    wallArea: purchaseType === 'sample' ? 0 : wallArea,
                    purchaseType,
                };
                newItems = [...state.cartItems, newItem];
            }

            AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems)).catch(console.error);
            return { cartItems: newItems };
        });
    },

    updateQuantity: (id, change) => {
        set((state) => {
            const newItems = state.cartItems.map(item => {
                if (item.id === id) { // Matches compositeId

                    const newQuantity = Math.max(0, item.quantity + change);

                    // Logic to scale rolls/area per unit
                    // Avoid division by zero if quantity goes to 0 (item will be filtered out anyway)
                    let newRolls = item.rollsNeeded;
                    let newArea = item.wallArea;

                    if (item.quantity > 0 && item.purchaseType !== 'sample') {
                        const rollsPerUnit = item.rollsNeeded / item.quantity;
                        const areaPerUnit = item.wallArea / item.quantity;
                        newRolls = newQuantity * rollsPerUnit;
                        newArea = newQuantity * areaPerUnit;
                    }

                    return {
                        ...item,
                        quantity: newQuantity,
                        rollsNeeded: newRolls,
                        wallArea: newArea,
                    };
                }
                return item;
            }).filter(item => item.quantity > 0);

            AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems)).catch(console.error);
            return { cartItems: newItems };
        });
    },

    removeFromCart: (id) => {
        set((state) => {
            const newItems = state.cartItems.filter(item => item.id !== id);
            AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems)).catch(console.error);
            return { cartItems: newItems };
        });
    },

    clearCart: () => {
        set({ cartItems: [] });
        AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify([])).catch(console.error);
    },

    getSubtotal: () => {
        const { cartItems } = get();
        return cartItems.reduce((total, item) => {
            if (item.purchaseType === 'sample') {
                return total + (5.00 * item.quantity); // $5.00 per sample
            } else {
                return total + (item.wallpaper.price * item.rollsNeeded);
            }
        }, 0);
    },

    getShippingCost: () => {
        const { cartItems } = get();
        // Rule: $0.99 per sample.
        const samplesCount = cartItems
            .filter(item => item.purchaseType === 'sample')
            .reduce((count, item) => count + item.quantity, 0);

        const hasRolls = cartItems.some(item => item.purchaseType !== 'sample');
        // Standard delivery $15 for rolls
        const standardDelivery = hasRolls ? 15.00 : 0;

        return (samplesCount * 0.99) + standardDelivery;
    },

    getGrandTotal: () => {
        const { getSubtotal, getShippingCost } = get();
        return getSubtotal() + getShippingCost();
    },

    getCartTotal: () => {
        // Alias for Subtotal? Or Total? 
        // Existing checkout uses getCartTotal for "Total", but logic defined it as item sum.
        // If I change this to return GrandTotal, components showing "Subtotal" might be wrong.
        // But components currently use it as THE total.
        // I will map it to getSubtotal for now to avoid breaking "Item Value", 
        // and Update Checkout to use getGrandTotal separately.
        const { getSubtotal } = get();
        return getSubtotal();
    },

    getCartItemsCount: () => {
        const { cartItems } = get();
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    },

    isInCart: (wallpaperId) => {
        const { cartItems } = get();
        // Check fuzzy match on wallpaperId part of composite ID or prop
        return cartItems.some(item => item.wallpaperId === wallpaperId || item.wallpaper?.id === wallpaperId);
    }
}));
