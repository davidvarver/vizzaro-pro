import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallpaper, wallpapers as defaultWallpapers } from '@/constants/wallpapers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const STORAGE_KEY = 'wallpapers_catalog';

interface WallpaperState {
    wallpapers: Wallpaper[];
    isLoading: boolean;
    error: string | null;

    loadWallpapers: (forceRefresh?: boolean) => Promise<void>;
    updateWallpaper: (updatedWallpaper: Wallpaper, adminToken?: string) => Promise<boolean>;
    addWallpaper: (newWallpaper: Wallpaper, adminToken?: string) => Promise<boolean>;
    deleteWallpaper: (wallpaperId: string, adminToken?: string) => Promise<boolean>;
    addMultipleWallpapers: (newWallpapers: Wallpaper[], adminToken?: string) => Promise<boolean>;
    replaceAllWallpapers: (newWallpapers: Wallpaper[], adminToken?: string) => Promise<boolean>;
    getWallpaperById: (id: string) => Wallpaper | undefined;
    resetCatalog: (adminToken?: string) => Promise<boolean>;
}

// Helper to save to API and Storage
async function saveToApiAndStorage(
    wallpapers: Wallpaper[],
    token: string | undefined,
    baseUrl: string
): Promise<void> {
    if (token && baseUrl) {
        const response = await fetch(`${baseUrl}/api/catalog/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ catalog: wallpapers }),
        });
        if (!response.ok) throw new Error('Failed to sync with API');
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallpapers));
}

export const useWallpaperStore = create<WallpaperState>()(
    persist(
        (set, get) => ({
            wallpapers: [],
            isLoading: false,
            error: null,

            loadWallpapers: async (forceRefresh = false) => {
                set({ isLoading: true, error: null });
                try {
                    // Try API if URL exists and not forcing local only? (Context logic was mixed)
                    // Simplified logic based on Context:
                    let loadedFromApi = false;

                    if (API_BASE_URL) {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/catalog/get?t=${Date.now()}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.success && Array.isArray(data.catalog) && data.catalog.length > 0) {
                                    set({ wallpapers: data.catalog, isLoading: false });
                                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.catalog));
                                    loadedFromApi = true;
                                }
                            }
                        } catch (e) {
                            console.warn('API fetch failed', e);
                        }
                    }

                    if (loadedFromApi) return;

                    if (!forceRefresh) {
                        const stored = await AsyncStorage.getItem(STORAGE_KEY);
                        if (stored) {
                            set({ wallpapers: JSON.parse(stored), isLoading: false });
                            return;
                        }
                    }

                    set({ wallpapers: defaultWallpapers, isLoading: false });
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWallpapers));
                } catch (error) {
                    console.error('Error loading wallpapers', error);
                    set({ error: 'Error al cargar catálogo', wallpapers: defaultWallpapers, isLoading: false });
                }
            },

            updateWallpaper: async (updatedWallpaper, adminToken) => {
                const { wallpapers } = get();
                const newWallpapers = wallpapers.map((w) =>
                    w.id === updatedWallpaper.id ? updatedWallpaper : w
                );
                try {
                    await saveToApiAndStorage(newWallpapers, adminToken, API_BASE_URL);
                    set({ wallpapers: newWallpapers });
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },

            addWallpaper: async (newWallpaper, adminToken) => {
                const { wallpapers } = get();
                const newWallpapers = [...wallpapers, newWallpaper];
                try {
                    await saveToApiAndStorage(newWallpapers, adminToken, API_BASE_URL);
                    set({ wallpapers: newWallpapers });
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },

            addMultipleWallpapers: async (newWallpapersList, adminToken) => {
                const { wallpapers } = get();
                const newWallpapers = [...wallpapers, ...newWallpapersList];
                try {
                    await saveToApiAndStorage(newWallpapers, adminToken, API_BASE_URL);
                    set({ wallpapers: newWallpapers });
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },

            deleteWallpaper: async (id, adminToken) => {
                const { wallpapers } = get();
                const newWallpapers = wallpapers.filter((w) => w.id !== id);
                try {
                    await saveToApiAndStorage(newWallpapers, adminToken, API_BASE_URL);
                    set({ wallpapers: newWallpapers });
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },

            replaceAllWallpapers: async (newWallpapers, adminToken) => {
                try {
                    await saveToApiAndStorage(newWallpapers, adminToken, API_BASE_URL);
                    set({ wallpapers: newWallpapers });
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            },

            getWallpaperById: (id) => {
                return get().wallpapers.find((w) => w.id === id);
            },

            resetCatalog: async (adminToken) => {
                if (!adminToken || !API_BASE_URL) return false;
                try {
                    const res = await fetch(`${API_BASE_URL}/api/catalog/reset`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${adminToken}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.catalog) {
                            set({ wallpapers: data.catalog });
                            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.catalog));
                            return true;
                        }
                    }
                    return false;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            }
        }),
        {
            name: 'wallpapers_store',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ wallpapers: state.wallpapers }), // Only persist wallpapers
        }
    )
);
