// __tests__/stores/cartStore.test.tsx
import React, { useEffect } from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { useCartStore } from '@/store/useCartStore';
import { Wallpaper } from '@/constants/wallpapers';

const TestComponent = () => {
    const { cartItems, addToCart, removeFromCart, clearCart, getSubtotal, isLoading, initialize } = useCartStore();

    useEffect(() => {
        initialize();
    }, []);

    const sampleWallpaper = {
        id: 'wall1',
        name: 'Test Wallpaper',
        price: 10,
        imageUrl: '',
        dimensions: { width: 0.53, height: 10 },
        specifications: {},
        category: 'Test',
        style: 'Test',
        imageUrls: []
    } as unknown as Wallpaper;

    if (isLoading) return <Text testID="loading">Loading...</Text>;

    return (
        <>
            <Text testID="count">{cartItems.length}</Text>
            <Text testID="total">{getSubtotal()}</Text>
            <Button testID="add" title="Add" onPress={() => addToCart(sampleWallpaper)} />
            <Button
                testID="remove"
                title="Remove"
                onPress={() => {
                    if (cartItems.length > 0) {
                        removeFromCart(cartItems[0].id);
                    }
                }}
            />
            <Button testID="clear" title="Clear" onPress={clearCart} />
        </>
    );
};

test('Cart store adds and removes items correctly', async () => {
    const { getByTestId, queryByTestId } = render(<TestComponent />);

    // Wait for loading to finish
    await waitFor(() => expect(queryByTestId('loading')).toBeNull());

    // Initially empty
    expect(getByTestId('count').props.children).toBe(0);
    expect(getByTestId('total').props.children).toBe(0);

    // Add an item
    fireEvent.press(getByTestId('add'));

    // Wait for update
    expect(getByTestId('count').props.children).toBe(1);
    expect(getByTestId('total').props.children).toBe(10); // 1 roll * 10 price

    // Remove the item
    fireEvent.press(getByTestId('remove'));
    expect(getByTestId('count').props.children).toBe(0);

    // Add again and clear
    fireEvent.press(getByTestId('add'));
    expect(getByTestId('count').props.children).toBe(1);

    fireEvent.press(getByTestId('clear'));
    expect(getByTestId('count').props.children).toBe(0);
});

