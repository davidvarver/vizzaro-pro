// __tests__/stores/cartStore.test.tsx
import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { Wallpaper } from '@/constants/wallpapers';

// Helper component to expose the hook inside the provider
const HookWrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
);

const TestComponent = () => {
    const { cartItems, addToCart, removeFromCart, clearCart, getCartTotal, isLoading } = useCart();
    const sampleWallpaper = {
        id: 'wall1',
        name: 'Test Wallpaper',
        price: 10,
        image: '',
    } as unknown as Wallpaper;

    if (isLoading) return <Text testID="loading">Loading...</Text>;

    return (
        <>
            <Text testID="count">{cartItems.length}</Text>
            <Text testID="total">{getCartTotal()}</Text>
            <Button testID="add" title="Add" onPress={() => addToCart(sampleWallpaper)} />
            <Button testID="remove" title="Remove" onPress={() => removeFromCart('wall1')} />
            <Button testID="clear" title="Clear" onPress={clearCart} />
        </>
    );
};

test('Cart store adds and removes items correctly', async () => {
    const { getByTestId, queryByTestId } = render(
        <HookWrapper>
            <TestComponent />
        </HookWrapper>
    );

    // Wait for loading to finish
    await waitFor(() => expect(queryByTestId('loading')).toBeNull());

    // Initially empty
    expect(getByTestId('count').props.children).toBe(0);
    expect(getByTestId('total').props.children).toBe(0);

    // Add an item
    fireEvent.press(getByTestId('add'));
    expect(getByTestId('count').props.children).toBe(1);
    expect(getByTestId('total').props.children).toBe(10);

    // Remove the item
    fireEvent.press(getByTestId('remove'));
    expect(getByTestId('count').props.children).toBe(0);

    // Add again and clear
    fireEvent.press(getByTestId('add'));
    fireEvent.press(getByTestId('clear'));
    expect(getByTestId('count').props.children).toBe(0);
});
