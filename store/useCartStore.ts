import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallpaper } from '@/constants/wallpapers';

export interface CartItem {
    id: string;
    wallpaper: Wallpaper;
    quantity: number;
    rollsNeeded: number;
    wallArea: number;
    purchaseType: 'roll' | 'measurement';
}

interface CartState {
    cartItems: CartItem[];
    isLoading: boolean;

    // Actions
    addToCart: (wallpaper: Wallpaper, rollsNeeded?: number, wallArea?: number, purchaseType?: 'roll' | 'measurement') => void;
    updateQuantity: (id: string, change: number) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    initialize: () => Promise<void>;

    // Getters (computed)
    getCartTotal: () => number;
    getCartItemsCount: () => number;
    isInCart: (wallpaperId: string) => boolean;
}

const CART_STORAGE_KEY = 'wallpaper_cart';

export const useCartStore = create<CartState>((set, get) => ({
    cartItems: [],
    isLoading: true,

    initialize: async () => {
        try {
            const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                set({ cartItems: JSON.parse(stored), isLoading: false });
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
            const existingItem = state.cartItems.find(item => item.id === wallpaper.id);
            let newItems;

            if (existingItem) {
                newItems = state.cartItems.map(item =>
                    item.id === wallpaper.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1,
                            rollsNeeded: item.rollsNeeded + rollsNeeded,
                            wallArea: item.wallArea + wallArea
                        }
                        : item
                );
            } else {
                const newItem: CartItem = {
                    id: wallpaper.id,
                    wallpaper,
                    quantity: 1,
                    rollsNeeded,
                    wallArea,
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
                if (item.id === id) {
                    const newQuantity = Math.max(0, item.quantity + change);
                    const rollsPerUnit = item.rollsNeeded / item.quantity;
                    const areaPerUnit = item.wallArea / item.quantity;
                    return {
                        ...item,
                        quantity: newQuantity,
                        rollsNeeded: newQuantity * rollsPerUnit,
                        wallArea: newQuantity * areaPerUnit,
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

    getCartTotal: () => {
        const { cartItems } = get();
        return cartItems.reduce((total, item) => total + (item.wallpaper.price * item.rollsNeeded), 0);
    },

    getCartItemsCount: () => {
        const { cartItems } = get();
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    },

    isInCart: (wallpaperId) => {
        const { cartItems } = get();
        return cartItems.some(item => item.id === wallpaperId);
    }
}));
