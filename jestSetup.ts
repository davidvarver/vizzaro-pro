// jestSetup.ts
// Global setup for Jest tests
import '@testing-library/jest-native/extend-expect';

// Mock environment variables
process.env.EXPO_PUBLIC_API_URL = 'https://mock-api.com';

// Mock AsyncStorage for React Native
jest.mock('@react-native-async-storage/async-storage', () => {
    let storage: Record<string, string> = {};
    return {
        setItem: jest.fn(async (key, value) => {
            storage[key] = value;
        }),
        getItem: jest.fn(async (key) => storage[key] ?? null),
        removeItem: jest.fn(async (key) => {
            delete storage[key];
        }),
        multiRemove: jest.fn(async (keys) => {
            keys.forEach((key: string) => delete storage[key]);
        }),
        clear: jest.fn(async () => {
            storage = {};
        }),
        getAllKeys: jest.fn(async () => Object.keys(storage)),
    };
});
