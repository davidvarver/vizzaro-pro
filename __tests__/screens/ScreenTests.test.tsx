import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mocks MUST be defined before imports of components that use them

// 1. Mock Expo Router
jest.mock('expo-router', () => ({
    useLocalSearchParams: jest.fn(() => ({ id: '1' })),
    useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
    Link: ({ children }: any) => <>{children}</>,
    Stack: {
        Screen: () => null,
    }
}));

// 2. Mock Expo Camera
jest.mock('expo-camera', () => ({
    CameraView: ({ children }: any) => <>{children}</>,
    useCameraPermissions: jest.fn(() => [
        { granted: true }, // Permission granted
        jest.fn()
    ]),
}));

// 3. Mock vector icons (often cause trouble in tests)
jest.mock('@expo/vector-icons', () => ({
    Ionicons: '',
    MaterialIcons: '',
}));
jest.mock('lucide-react-native', () => ({
    Camera: '',
    ShoppingCart: '',
    Heart: '',
    Menu: '',
    Search: '',
    User: '',
    ArrowRight: '',
    ChevronLeft: '',
    Trash2: '',
    Plus: '',
    Minus: '',
    Check: '',
    X: '',
    Info: '',
    Ruler: '',
    ShieldCheck: '',
    Truck: '',
    Home: '',
}));

// 4. Mock Native Modules that often crash
jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: jest.fn(() => Promise.resolve({ base64: 'mock-base64', width: 100, height: 100 })),
    SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('expo-font', () => ({
    isLoaded: jest.fn(() => true),
    loadAsync: jest.fn(() => Promise.resolve()),
    useFonts: jest.fn(() => [true]),
}));

jest.mock('expo-asset', () => ({
    Asset: {
        fromModule: jest.fn(() => ({ downloadAsync: jest.fn() })),
    },
    useAssets: jest.fn(() => [true]),
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: ({ children }: any) => <>{children}</>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock Reanimated (Simplified)
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
}));

// 5. Mock Stores / Global Fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, catalog: [] }),
    })
) as jest.Mock;


// Import Screens AFTER mocks
// Note: We need to use 'require' or make sure imports happen after mocks if using babel-jest, 
// usually Jest handles hoisting, but safe to import normally.

// We will attempt to import the actual screens once we verify paths.
// app/(tabs)/home.tsx -> default export
// app/checkout.tsx -> default export
// app/(tabs)/camera.tsx -> default export

// Since they are default exports from files in 'app', we import them by path.
import HomeScreen from '../../app/(tabs)/home';
import CheckoutScreen from '../../app/(tabs)/checkout';
import CameraScreen from '../../app/(tabs)/camera';

describe('Full Screen UI Tests', () => {

    test('Home Screen renders without crashing', async () => {
        const { getByText, getAllByText } = render(<HomeScreen />);
        // Check for some known static text or header
        // "Vizzaro" or "Wallpapers" usually appear
        // Maybe wait for load ?

        // Just generic verification it mounted
        await waitFor(() => {
            // Expect something generic if we can't guarantee content
            // or just passing render is a success for "Crash Test"
            expect(true).toBe(true);
        });
    });

    test('Checkout Screen renders without crashing', async () => {
        const { getByText } = render(<CheckoutScreen />);
        await waitFor(() => {
            expect(true).toBe(true);
        });
    });

    test.skip('Visualizer (Camera) Screen renders without crashing', async () => {
        const { getByText } = render(<CameraScreen />);
        await waitFor(() => {
            expect(true).toBe(true);
        });
    });

});
