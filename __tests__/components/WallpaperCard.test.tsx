// __tests__/components/WallpaperCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WallpaperCard } from '@/components/WallpaperCard';
import { Wallpaper } from '@/constants/wallpapers';

const mockWallpaper = {
    id: '1',
    name: 'Test Wallpaper',
    price: 99.99,
    image: 'https://example.com/image.jpg',
} as unknown as Wallpaper;

describe('WallpaperCard', () => {
    test('renders correctly', () => {
        const onPress = jest.fn();
        const { getByText } = render(
            <WallpaperCard item={mockWallpaper} onPress={onPress} width={150} />
        );

        expect(getByText('Test Wallpaper')).toBeTruthy();
        expect(getByText('$99.99')).toBeTruthy();
    });

    test('calls onPress when pressed', () => {
        const onPress = jest.fn();
        const { getByText } = render(
            <WallpaperCard item={mockWallpaper} onPress={onPress} width={150} />
        );

        fireEvent.press(getByText('Test Wallpaper'));
        expect(onPress).toHaveBeenCalledWith(mockWallpaper);
    });
});
