import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallpaper } from '@/constants/wallpapers';

interface HistoryState {
    recentItems: Wallpaper[];

    // Actions
    initialize: () => Promise<void>;
    addToHistory: (item: Wallpaper) => Promise<void>;
    clearHistory: () => Promise<void>;
}

const STORAGE_KEY = 'recent_wallpapers';

export const useHistoryStore = create<HistoryState>((set, get) => ({
    recentItems: [],

    initialize: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                set({ recentItems: JSON.parse(stored) });
            }
        } catch (error) {
            console.log('Error loading history:', error);
        }
    },

    addToHistory: async (item: Wallpaper) => {
        try {
            const { recentItems } = get();
            // Avoid duplicates and limit to 10
            const filtered = recentItems.filter(i => i.id !== item.id);
            const newHistory = [item, ...filtered].slice(0, 10);

            set({ recentItems: newHistory });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        } catch (error) {
            console.log('Error saving history:', error);
        }
    },

    clearHistory: async () => {
        set({ recentItems: [] });
        await AsyncStorage.removeItem(STORAGE_KEY);
    }
}));
