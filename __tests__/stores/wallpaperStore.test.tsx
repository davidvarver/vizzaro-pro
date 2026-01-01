// __tests__/stores/wallpaperStore.test.tsx
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { WallpapersProvider, useWallpapers } from '@/contexts/WallpapersContext';

const HookWrapper = ({ children }: { children: React.ReactNode }) => (
    <WallpapersProvider>{children}</WallpapersProvider>
);

const TestComponent = () => {
    const { wallpapers, isLoading, refetchWallpapers } = useWallpapers();

    if (isLoading) return <Text testID="loading">Loading...</Text>;

    return (
        <>
            <Text testID="count">{wallpapers.length}</Text>
            <Text testID="first-name">{wallpapers[0]?.name || 'None'}</Text>
            <Button testID="refresh" title="Refresh" onPress={() => refetchWallpapers()} />
        </>
    );
};

// Mock fetch
const mockWallpapers = [
    { id: '1', name: 'Wall 1', price: 10, image: 'url1' },
    { id: '2', name: 'Wall 2', price: 20, image: 'url2' },
];

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, catalog: mockWallpapers, timestamp: 123 }),
    })
) as jest.Mock;

test('Wallpaper store fetches and displays wallpapers', async () => {
    const { getByTestId, queryByTestId } = render(
        <HookWrapper>
            <TestComponent />
        </HookWrapper>
    );

    // Wait for loading to finish
    await waitFor(() => expect(queryByTestId('loading')).toBeNull());

    // Verify fetch called
    expect(global.fetch).toHaveBeenCalled();

    // Verify data
    expect(getByTestId('count').props.children).toBe(2);
    expect(getByTestId('first-name').props.children).toBe('Wall 1');

    // Trigger refresh
    fireEvent.press(getByTestId('refresh'));

    // Should reload
    expect(global.fetch).toHaveBeenCalledTimes(2);
});
