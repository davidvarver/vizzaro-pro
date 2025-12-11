import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  addToCart: (
    wallpaper: Wallpaper,
    rollsNeeded?: number,
    wallArea?: number,
    purchaseType?: 'roll' | 'measurement'
  ) => void;
  updateQuantity: (id: string, change: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemsCount: () => number;
  isInCart: (wallpaperId: string) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartItems: [],

      addToCart: (
        wallpaper,
        rollsNeeded = 1,
        wallArea = 5.33,
        purchaseType = 'roll'
      ) => {
        set((state) => {
          const existingItem = state.cartItems.find((item) => item.id === wallpaper.id);

          if (existingItem) {
            return {
              cartItems: state.cartItems.map((item) =>
                item.id === wallpaper.id
                  ? {
                      ...item,
                      quantity: item.quantity + 1,
                      rollsNeeded: item.rollsNeeded + rollsNeeded,
                      wallArea: item.wallArea + wallArea,
                    }
                  : item
              ),
            };
          } else {
            const newItem: CartItem = {
              id: wallpaper.id,
              wallpaper,
              quantity: 1,
              rollsNeeded,
              wallArea,
              purchaseType,
            };
            return { cartItems: [...state.cartItems, newItem] };
          }
        });
      },

      updateQuantity: (id, change) => {
        set((state) => ({
          cartItems: state.cartItems
            .map((item) => {
              if (item.id === id) {
                const newQuantity = Math.max(0, item.quantity + change);
                if (newQuantity === 0) return null; // Filter out later

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
            })
            .filter((item): item is CartItem => item !== null && item.quantity > 0),
        }));
      },

      removeFromCart: (id) => {
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.id !== id),
        }));
      },

      clearCart: () => {
        set({ cartItems: [] });
      },

      getCartTotal: () => {
        const { cartItems } = get();
        return cartItems.reduce(
          (total, item) => total + item.wallpaper.price * item.rollsNeeded,
          0
        );
      },

      getCartItemsCount: () => {
        const { cartItems } = get();
        return cartItems.reduce((count, item) => count + item.quantity, 0);
      },

      isInCart: (wallpaperId) => {
        return get().cartItems.some((item) => item.id === wallpaperId);
      },
    }),
    {
      name: 'wallpaper_cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
