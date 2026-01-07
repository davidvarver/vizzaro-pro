import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Wallpaper, wallpapers as defaultWallpapers } from '@/constants/wallpapers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const STORAGE_KEY = 'wallpapers_catalog';

// New interface for saved user rooms
export interface UserRoom {
    id: string;
    image: string; // Base64 or URI
    maskImage?: string; // Base64 of the generated wall mask
    createdAt: number;
    name?: string;
}

interface WallpapersState {
    wallpapers: Wallpaper[];
    isLoading: boolean;
    error: string | null;
    visualizerImage: string | null;

    // Room Gallery State
    userRooms: UserRoom[];

    // Actions
    loadWallpapers: (forceRefresh?: boolean) => Promise<void>;
    updateWallpaper: (updatedWallpaper: Wallpaper, adminToken?: string) => Promise<boolean>;
    addWallpaper: (newWallpaper: Wallpaper, adminToken?: string) => Promise<boolean>;
    addMultipleWallpapers: (newWallpapers: Wallpaper[], adminToken?: string) => Promise<boolean>;
    replaceAllWallpapers: (newWallpapers: Wallpaper[], adminToken?: string) => Promise<boolean>;
    deleteWallpaper: (wallpaperId: string, adminToken?: string) => Promise<boolean>;
    getWallpaperById: (id: string) => Wallpaper | undefined;
    refetchWallpapers: () => Promise<void>;
    resetCatalog: (adminToken?: string) => Promise<boolean>;
    setVisualizerImage: (image: string | null) => void;

    // Room Gallery Actions
    addUserRoom: (image: string) => Promise<void>;
    deleteUserRoom: (id: string) => Promise<void>;
    updateUserRoomMask: (roomId: string, maskImage: string) => Promise<void>;
    loadUserRooms: () => Promise<void>;

    // Helper to sync to storage/API
    saveWallpapers: (wallpapersData: Wallpaper[], authToken?: string) => Promise<boolean>;
    initialize: () => Promise<void>;
}

// Helper to auto-group wallpapers based on name similarity
const enrichWallpaperData = (data: any[]): Wallpaper[] => {
    // 1. Common suffixes to strip
    const SUFFIXES = [
        'PEEL & STICK WALLPAPER',
        'PEEL AND STICK WALLPAPER',
        'WALLPAPER',
        'PAPEL TAPIZ',
        'WALL MURAL',
        'FLOOR TILES',
        'WALL DECALS',
        'MOULDING',
        'WALL PANELS',
        'PEEL & STICK'
    ];

    // 2. Common colors and descriptors to strip
    const COLORS = [
        'OFF WHITE', 'OFF-WHITE', 'WHITE', 'BLANCO',
        'TEAL', 'TURQUESA',
        'DARK BROWN', 'LIGHT BROWN', 'BROWN', 'CAFE', 'MARRON',
        'AQUA',
        'NAVY', 'AZUL MARINO', 'SKY BLUE', 'POWDERED BLUE', 'LIGHT BLUE', 'BLUE', 'AZUL', 'COBALT', 'COBALTO', 'INDIGO', 'INDIGO',
        'PINK', 'ROSA', 'ROSE', 'BLUSH', 'RUBOR', 'MAGENTA',
        'BLACK & WHITE', 'BLACK AND WHITE', 'BLACK', 'NEGRO', 'CHARCOAL', 'CARBON', 'ONYX',
        'GREY', 'GRAY', 'GRIS', 'SILVER', 'PLATA', 'SLATE', 'PIZARRA',
        'GOLD', 'DORADO', 'METALLIC', 'METALICO', 'COPPER', 'COBRE',
        'GREEN', 'VERDE', 'EMERALD', 'ESMERALDA', 'SAGE', 'OLIVE', 'OLIVA', 'MINT', 'MENTA', 'MOSS', 'MUSGO', 'CHARTREUSE', 'FOREST',
        'BEIGE', 'CREAM', 'CREMA', 'TAN', 'TOSTADO', 'TAUPE', 'OATMEAL', 'AVENA', 'NEUTRAL', 'NEUTRO', 'NATURAL',
        'YELLOW', 'AMARILLO', 'MUSTARD', 'MOSTAZA',
        'RED', 'ROJO', 'RUST', 'OXIDO', 'BURGUNDY', 'VINO',
        'ORANGE', 'NARANJA', 'PEACH', 'DURAZNO', 'CORAL', 'TERRACOTTA', 'TERRACOTA',
        'PURPLE', 'MORADO', 'LILAC', 'LILA', 'MAUVE', 'VIOLET', 'VIOLETA', 'LAVENDER', 'LAVANDA', 'PLUM', 'CIRUELA',
        'MULTI', 'MULTICOLOR', 'RAINBOW', 'ARCOIRIS', 'PASTEL', 'BREEZY'
    ];

    return data.map(item => {
        // If group already exists, keep it
        if (item.group) return item;

        // Otherwise, infer it
        let name = item.name.toUpperCase();

        // Remove Suffixes
        SUFFIXES.forEach(suffix => {
            name = name.replace(suffix, '');
        });

        // Remove Colors (Careful to match whole words)
        COLORS.forEach(color => {
            // Regex to match color as a whole word
            const regex = new RegExp(`\\b${color}\\b`, 'g');
            name = name.replace(regex, '');
        });

        // Clean up
        const modelName = name.replace(/[^A-Z0-9]/g, ' ').trim().replace(/\s+/g, '-').toLowerCase();

        return {
            ...item,
            group: modelName // Use the "slugified" model name as the group ID
        };
    });
};

export const useWallpapersStore = create<WallpapersState>((set, get) => ({
    wallpapers: [],
    isLoading: true,
    error: null,
    visualizerImage: null,

    loadWallpapers: async (forceRefresh = false) => {
        try {
            console.log('[WallpapersStore] Loading catalog... (forceRefresh:', forceRefresh, ')');
            set({ error: null, isLoading: true });

            // On Web, we can use relative paths if no API URL is set
            const shouldFetchApi = API_BASE_URL || Platform.OS === 'web';

            if (shouldFetchApi) {
                try {
                    const newItemBaseUrl = API_BASE_URL || '';
                    console.log('[WallpapersStore] Attempting to load from API:', `${newItemBaseUrl}/api/catalog/get`);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const response = await fetch(`${newItemBaseUrl}/api/catalog/get?t=${Date.now()}`, {
                        method: 'GET',
                        headers: {
                            'Cache-Control': 'no-store, no-cache, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                        },
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        // console.log('[WallpapersStore] Loaded from API:', data.catalog?.length || 0, 'items');

                        if (data.success && data.catalog && Array.isArray(data.catalog)) {
                            const validCatalog = data.catalog.filter((item: any) =>
                                item && typeof item === 'object' && item.id && item.name
                            );

                            // Process and Enrich Data
                            const enrichedCatalog = enrichWallpaperData(validCatalog);

                            console.log('[WallpapersStore] Enriched items:', enrichedCatalog.length);

                            if (enrichedCatalog.length > 0) {
                                set({ wallpapers: enrichedCatalog, isLoading: false });
                                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedCatalog));
                                await AsyncStorage.setItem(STORAGE_KEY + '_timestamp', data.timestamp?.toString() || Date.now().toString());
                                return;
                            } else {
                                console.warn('[WallpapersStore] No valid items in catalog, using defaults');
                            }
                        }
                    } else {
                        console.warn('[WallpapersStore] API returned error:', response.status);
                        const errorText = await response.text();
                        console.warn('[WallpapersStore] Error details:', errorText);
                    }
                } catch (apiError) {
                    console.warn('[WallpapersStore] API fetch failed, trying fallback:', apiError);
                }
            } else {
                console.log('[WallpapersStore] No API URL configured, using local storage mode');
            }

            if (!forceRefresh) {
                console.log('[WallpapersStore] Loading from AsyncStorage...');
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    console.log('[WallpapersStore] Loaded from storage:', parsed.length, 'items');
                    set({ wallpapers: parsed, isLoading: false });
                    return;
                }
            }

            console.log('[WallpapersStore] Using default wallpapers:', defaultWallpapers.length, 'items');
            set({ wallpapers: defaultWallpapers, isLoading: false });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWallpapers));

        } catch (error) {
            console.error('[WallpapersStore] Error loading wallpapers:', error);
            set({ error: 'Error al cargar el catálogo', wallpapers: defaultWallpapers, isLoading: false });
        }
    },

    saveWallpapers: async (wallpapersData: Wallpaper[], authToken?: string): Promise<boolean> => {
        try {
            console.log('[WallpapersStore] Saving catalog with', wallpapersData.length, 'items...');

            if (!authToken) {
                throw new Error('No hay token de autenticación. Por favor inicia sesión.');
            }

            console.log('[WallpapersStore] Using auth token:', !!authToken);

            const shouldFetchApi = API_BASE_URL || Platform.OS === 'web';

            if (shouldFetchApi) {
                const newItemBaseUrl = API_BASE_URL || '';
                const apiUrl = `${newItemBaseUrl}/api/catalog/update`;
                console.log('[WallpapersStore] Syncing to API:', apiUrl);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                let response;
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                        },
                        body: JSON.stringify({
                            catalog: wallpapersData
                        }),
                        signal: controller.signal,
                    });
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    console.error('[WallpapersStore] Fetch error:', fetchError);

                    if (fetchError instanceof Error) {
                        if (fetchError.name === 'AbortError') {
                            throw new Error('⏱️ Tiempo de espera agotado.\n\nEl servidor no respondió a tiempo. Verifica tu conexión a internet.');
                        }

                        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('Network request failed')) {
                            throw new Error('🌐 Error de conexión\n\nNo se pudo conectar al servidor. Posibles causas:\n\n1. Sin conexión a internet\n2. El servidor está caído\n3. URL incorrecta: ' + apiUrl + '\n\nIntenta nuevamente en unos momentos.');
                        }
                    }

                    throw new Error('Error de red: ' + (fetchError instanceof Error ? fetchError.message : 'Desconocido'));
                }

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[WallpapersStore] API error response:', response.status, errorText);
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { error: errorText };
                    }

                    if (errorData.needsConfig) {
                        throw new Error('⚠️ Base de datos no configurada\n\nPor favor configura Vercel KV:\n1. Ve a tu proyecto en Vercel\n2. Settings → Environment Variables\n3. Configura KV_REST_API_URL y KV_REST_API_TOKEN');
                    }

                    if (response.status === 401) {
                        throw new Error('🔒 No autorizado\n\nToken de administrador inválido.');
                    }

                    if (response.status === 503) {
                        throw new Error('⚠️ Servicio no disponible\n\n' + (errorData.error || 'El servidor no está disponible.'));
                    }

                    throw new Error(errorData.error || `Error del servidor (${response.status})`);
                }

                const data = await response.json();
                console.log('[WallpapersStore] Synced to API successfully:', data);

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallpapersData));
                await AsyncStorage.setItem(STORAGE_KEY + '_timestamp', data.timestamp?.toString() || Date.now().toString());
                console.log('[WallpapersStore] Saved to AsyncStorage');

                set({ wallpapers: wallpapersData });
            } else {
                console.log('[WallpapersStore] No API URL configured, saving only to local storage');

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallpapersData));
                await AsyncStorage.setItem(STORAGE_KEY + '_timestamp', Date.now().toString());
                console.log('[WallpapersStore] Saved to AsyncStorage');

                set({ wallpapers: wallpapersData });
            }

            return true;
        } catch (error) {
            console.error('[WallpapersStore] Error saving wallpapers:', error);
            throw error;
        }
    },

    updateWallpaper: async (updatedWallpaper: Wallpaper, adminToken?: string) => {
        const { wallpapers, saveWallpapers } = get();
        try {
            console.log('[WallpapersStore] Updating wallpaper:', updatedWallpaper.id);

            const updatedWallpapers = wallpapers.map(wallpaper =>
                wallpaper.id === updatedWallpaper.id ? updatedWallpaper : wallpaper
            );

            await saveWallpapers(updatedWallpapers, adminToken);
            console.log('[WallpapersStore] Wallpaper updated successfully:', updatedWallpaper.id);
            return true;
        } catch (error) {
            console.error('[WallpapersStore] Error updating wallpaper:', error);
            throw error;
        }
    },

    addWallpaper: async (newWallpaper: Wallpaper, adminToken?: string) => {
        const { wallpapers, saveWallpapers } = get();
        try {
            console.log('[WallpapersStore] Adding new wallpaper:', newWallpaper.id);

            const updatedWallpapers = [...wallpapers, newWallpaper];

            await saveWallpapers(updatedWallpapers, adminToken);
            console.log('[WallpapersStore] Wallpaper added successfully');

            return true;
        } catch (error) {
            console.error('[WallpapersStore] Error adding wallpaper:', error);
            return false;
        }
    },

    addMultipleWallpapers: async (newWallpapers: Wallpaper[], adminToken?: string) => {
        const { wallpapers, saveWallpapers } = get();
        try {
            console.log('[WallpapersStore] Adding multiple wallpapers:', newWallpapers.length);

            const updatedWallpapers = [...wallpapers, ...newWallpapers];

            await saveWallpapers(updatedWallpapers, adminToken);
            console.log('[WallpapersStore] Multiple wallpapers added successfully');

            return true;
        } catch (error) {
            console.error('[WallpapersStore] Error adding multiple wallpapers:', error);
            return false;
        }
    },

    replaceAllWallpapers: async (newWallpapers: Wallpaper[], adminToken?: string) => {
        const { saveWallpapers } = get();
        try {
            console.log('[WallpapersStore] Replacing all wallpapers with:', newWallpapers.length, 'items');

            await saveWallpapers(newWallpapers, adminToken);
            console.log('[WallpapersStore] All wallpapers replaced successfully');

            return true;
        } catch (error) {
            console.error('[WallpapersStore] Error replacing wallpapers:', error);
            return false;
        }
    },

    deleteWallpaper: async (wallpaperId: string, adminToken?: string) => {
        const { wallpapers, saveWallpapers } = get();
        try {
            const updatedWallpapers = wallpapers.filter(wallpaper => wallpaper.id !== wallpaperId);

            await saveWallpapers(updatedWallpapers, adminToken);
            console.log('[WallpapersStore] Wallpaper deleted successfully');
            return true;
        } catch (error) {
            console.error('[WallpapersStore] Error deleting wallpaper:', error);
            return false;
        }
    },

    getWallpaperById: (id: string) => {
        return get().wallpapers.find(wallpaper => wallpaper.id === id);
    },

    refetchWallpapers: async () => {
        console.log('[WallpapersStore] Manual refetch requested');
        return get().loadWallpapers(true);
    },

    resetCatalog: async (adminToken?: string) => {
        try {
            console.log('[WallpapersStore] Resetting catalog...');

            if (!adminToken) {
                throw new Error('No hay token de autenticación. Por favor inicia sesión.');
            }

            const shouldFetchApi = API_BASE_URL || Platform.OS === 'web';

            if (!shouldFetchApi) {
                throw new Error('No hay URL de API configurada.');
            }

            const newItemBaseUrl = API_BASE_URL || '';
            const apiUrl = `${newItemBaseUrl}/api/catalog/reset`;
            console.log('[WallpapersStore] Calling reset API:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${adminToken}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[WallpapersStore] Reset API error:', response.status, errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }
                throw new Error(errorData.error || `Error del servidor (${response.status})`);
            }

            const data = await response.json();
            console.log('[WallpapersStore] Catalog reset successfully:', data);

            if (data.success && data.catalog) {
                set({ wallpapers: data.catalog });
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.catalog));
                await AsyncStorage.setItem(STORAGE_KEY + '_timestamp', data.timestamp?.toString() || Date.now().toString());
            }

            return true;
        } catch (error) {
            console.error('[WallpapersStore] Error resetting catalog:', error);
            throw error;
        }
    },

    setVisualizerImage: (image: string | null) => set({ visualizerImage: image }),

    // Room Gallery Implementation
    userRooms: [],

    addUserRoom: async (image: string) => {
        const { userRooms } = get();
        const newRoom: UserRoom = {
            id: Date.now().toString(),
            image,
            createdAt: Date.now(),
            name: `Habitación ${userRooms.length + 1}`
        };

        const updatedRooms = [newRoom, ...userRooms];
        set({ userRooms: updatedRooms });

        try {
            await AsyncStorage.setItem('user_rooms_gallery', JSON.stringify(updatedRooms));
            console.log('[WallpapersStore] Room added to gallery:', newRoom.id);
        } catch (error) {
            console.error('[WallpapersStore] Error saving room to storage:', error);
        }
    },

    deleteUserRoom: async (id: string) => {
        const { userRooms } = get();
        const updatedRooms = userRooms.filter(room => room.id !== id);
        set({ userRooms: updatedRooms });

        try {
            await AsyncStorage.setItem('user_rooms_gallery', JSON.stringify(updatedRooms));
            console.log('[WallpapersStore] Room deleted from gallery:', id);
        } catch (error) {
            console.error('[WallpapersStore] Error updating rooms storage:', error);
        }
    },

    loadUserRooms: async () => {
        try {
            const stored = await AsyncStorage.getItem('user_rooms_gallery');
            if (stored) {
                const parsed = JSON.parse(stored);
                set({ userRooms: parsed });
                console.log('[WallpapersStore] Loaded user rooms:', parsed.length);
            }
        } catch (error) {
            console.error('[WallpapersStore] Error loading user rooms:', error);
        }
    },

    updateUserRoomMask: async (roomId: string, maskImage: string) => {
        const { userRooms } = get();
        const updatedRooms = userRooms.map(room =>
            room.id === roomId ? { ...room, maskImage } : room
        );
        set({ userRooms: updatedRooms });

        try {
            await AsyncStorage.setItem('user_rooms_gallery', JSON.stringify(updatedRooms));
            console.log('[WallpapersStore] Updated room mask:', roomId);
        } catch (error) {
            console.error('[WallpapersStore] Error saving room mask:', error);
        }
    },

    initialize: async () => {
        try {
            // Priority: Load from local storage first for speed, then enrich
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // CRITICAL: Always enrich stored data to ensure new grouping logic applies to cached items
                const enriched = enrichWallpaperData(parsed);
                set({ wallpapers: enriched, isLoading: false });
                console.log('[WallpapersStore] Initialized with', enriched.length, 'enriched items from storage');
            }

            // Then fetch fresh data in background
            await get().loadWallpapers();
            await get().loadUserRooms();
        } catch (e) {
            console.error('[WallpapersStore] Initialization error:', e);
            await get().loadWallpapers();
        }
    },
}));
