// __tests__/stores/wallpaperStore.test.tsx
import React, { useEffect } from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { useWallpapersStore } from '@/store/useWallpapersStore';

// Mock fetch
const mockWallpapers = [
    {
        id: '1',
        name: 'Wall 1',
        price: 10,
        imageUrl: 'url1',
        dimensions: { width: 0.53, height: 10 },
        specifications: {},
        category: 'Test',
        style: 'Test',
        imageUrls: ['url1']
    },
    {
        id: '2',
        name: 'Wall 2',
        price: 20,
        imageUrl: 'url2',
        dimensions: { width: 0.53, height: 10 },
        specifications: {},
        category: 'Test',
        style: 'Test',
        imageUrls: ['url2']
    },
];

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, catalog: mockWallpapers, timestamp: 123 }),
    })
) as jest.Mock;

const TestComponent = () => {
    const { wallpapers, isLoading, loadWallpapers, refetchWallpapers } = useWallpapersStore();

    useEffect(() => {
        // Trigger fetch on mount if empty? Or assumes store auto-fetches?
        // Usually store might verify timestamp on mount.
        loadWallpapers();
    }, []);

    if (isLoading) return <Text testID="loading">Loading...</Text>;

    return (
        <>
            <Text testID="count">{wallpapers.length}</Text>
            <Text testID="first-name">{wallpapers[0]?.name || 'None'}</Text>
            <Button testID="refresh" title="Refresh" onPress={() => refetchWallpapers()} />
        </>
    );
};

test('Wallpaper store fetches and displays wallpapers', async () => {
    const { getByTestId, queryByTestId } = render(<TestComponent />);

    // Wait for loading to finish
    await waitFor(() => expect(queryByTestId('loading')).toBeNull());

    // Verify fetch called
    expect(global.fetch).toHaveBeenCalled();

    // Verify data
    // Note: If the store uses async storage, it might persist data. 
    // For unit tests, we're mocking fetch.
    expect(getByTestId('count').props.children).toBe(2);
    expect(getByTestId('first-name').props.children).toBe('Wall 1');

    // Trigger refresh
    fireEvent.press(getByTestId('refresh'));

    // Should reload
    expect(global.fetch).toHaveBeenCalledTimes(2);
});

