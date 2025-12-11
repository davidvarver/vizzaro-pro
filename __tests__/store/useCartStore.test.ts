import { act, renderHook } from '@testing-library/react-hooks';
import { useCartStore } from '../../stores/useCartStore';

// Mock AsyncStorage since we are testing logic, not persistence in this unit test
jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
}));

describe('useCartStore', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useCartStore());
        act(() => {
            result.current.clearCart();
        });
    });

    it('should start with an empty cart', () => {
        const { result } = renderHook(() => useCartStore());
        expect(result.current.cartItems).toEqual([]);
    });

    it('should add an item to the cart', () => {
        const { result } = renderHook(() => useCartStore());
        const mockWallpaper = {
            id: '1',
            name: 'Test Wallpaper',
            price: 100,
            imageUrl: 'test.jpg',
            category: 'Test',
            description: 'Desc',
            width: 1,
            height: 1,
            inStock: true,
            featured: false,
            style: 'Modern',
            colors: ['Red']
        };

        act(() => {
            result.current.addToCart(mockWallpaper, 2); // Add 2 rolls
        });

        expect(result.current.cartItems.length).toBe(1);
        expect(result.current.cartItems[0].wallpaper.id).toBe('1');
        expect(result.current.cartItems[0].rollsNeeded).toBe(2);
    });

    it('should update quantity if item already exists', () => {
        const { result } = renderHook(() => useCartStore());
        const mockWallpaper = {
            id: '1',
            name: 'Test Wallpaper',
            price: 100,
            imageUrl: 'test.jpg',
            category: 'Test',
            description: 'Desc',
            width: 1,
            height: 1,
            inStock: true,
            featured: false,
            style: 'Modern',
            colors: ['Red']
        };

        act(() => {
            result.current.addToCart(mockWallpaper, 1);
        });

        act(() => {
            result.current.addToCart(mockWallpaper, 2);
        });

        expect(result.current.cartItems.length).toBe(1);
        expect(result.current.cartItems[0].rollsNeeded).toBe(3); // 1 + 2
    });

    it('should remove item from cart', () => {
        const { result } = renderHook(() => useCartStore());
        const mockWallpaper = { id: '1', name: 'W1', price: 10 } as any;

        act(() => {
            result.current.addToCart(mockWallpaper, 1);
        });

        expect(result.current.cartItems.length).toBe(1);

        act(() => {
            result.current.removeFromCart('1');
        });

        expect(result.current.cartItems.length).toBe(0);
    });

    it('should calculate total correctly', () => {
        const { result } = renderHook(() => useCartStore());
        const w1 = { id: '1', price: 100 } as any;
        const w2 = { id: '2', price: 50 } as any;

        act(() => {
            result.current.addToCart(w1, 2); // 200
            result.current.addToCart(w2, 1); // 50
        });

        expect(result.current.getCartTotal()).toBe(250);
    });
});
