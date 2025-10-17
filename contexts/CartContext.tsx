import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Wallpaper } from '@/constants/wallpapers';

export interface CartItem {
  id: string;
  wallpaper: Wallpaper;
  quantity: number;
  rollsNeeded: number;
  wallArea: number;
  purchaseType: 'roll' | 'measurement';
}

const CART_STORAGE_KEY = 'wallpaper_cart';

export const [CartProvider, useCart] = createContextHook(() => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveCart = useCallback(async () => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, [cartItems]);

  const loadCart = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load cart from storage on init
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Save cart to storage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveCart();
    }
  }, [cartItems, isLoading, saveCart]);

  const addToCart = useCallback((wallpaper: Wallpaper, rollsNeeded: number = 1, wallArea: number = 5.33, purchaseType: 'roll' | 'measurement' = 'roll') => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === wallpaper.id);
      
      if (existingItem) {
        // Update existing item - add one more unit with its corresponding rolls
        return prevItems.map(item =>
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
        // Add new item
        const newItem: CartItem = {
          id: wallpaper.id,
          wallpaper,
          quantity: 1, // This represents 1 unit (which includes rollsNeeded rolls)
          rollsNeeded, // This is the total rolls for this quantity
          wallArea,
          purchaseType,
        };
        return [...prevItems, newItem];
      }
    });
  }, []);

  const updateQuantity = useCallback((id: string, change: number) => {
    setCartItems(prevItems =>
      prevItems.map(item => {
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
      }).filter(item => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.wallpaper.price * item.rollsNeeded), 0);
  }, [cartItems]);

  const getCartItemsCount = useCallback(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const isInCart = useCallback((wallpaperId: string) => {
    return cartItems.some(item => item.id === wallpaperId);
  }, [cartItems]);

  return useMemo(() => ({
    cartItems,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemsCount,
    isInCart,
  }), [cartItems, isLoading, addToCart, updateQuantity, removeFromCart, clearCart, getCartTotal, getCartItemsCount, isInCart]);
});