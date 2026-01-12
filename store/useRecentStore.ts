import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_KEY = 'recent_wallpapers_v1';

interface RecentState {
    recentIds: string[];
    addRecent: (id: string) => Promise<void>;
    loadRecents: () => Promise<void>;
}

export const useRecentStore = create<RecentState>((set, get) => ({
    recentIds: [],

    addRecent: async (id: string) => {
        const { recentIds } = get();
        // Remove existing instance of id (if any) and prepend to front.
        // Keep max 20 items.
        const updated = [id, ...recentIds.filter(rid => rid !== id)].slice(0, 20);

        set({ recentIds: updated });

        try {
            await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save recents', e);
        }
    },

    loadRecents: async () => {
        try {
            const stored = await AsyncStorage.getItem(RECENT_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    set({ recentIds: parsed });
                }
            }
        } catch (e) {
            console.error('Failed to load recents', e);
        }
    }
}));
