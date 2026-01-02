import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces
export interface Collection {
    id: string;
    name: string;
    image: string;
    category: string;
    featured: boolean;
}

interface CollectionsState {
    collections: Collection[];
    isLoading: boolean;
    error: string | null;

    // Actions
    initialize: () => Promise<void>;
    loadCollections: (forceRefresh?: boolean) => Promise<void>;
    addCollection: (newCollection: Collection, adminToken?: string) => Promise<boolean>;
    updateCollection: (updatedCollection: Collection, adminToken?: string) => Promise<boolean>;
    deleteCollection: (collectionId: string, adminToken?: string) => Promise<boolean>;
    refetchCollections: () => Promise<void>;
}

const STORAGE_KEY = 'featured_collections';

// Helper to get API URL
function getApiBaseUrl(): string {
    if (process.env.EXPO_PUBLIC_API_URL) {
        const url = process.env.EXPO_PUBLIC_API_URL;
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }
    if (typeof window !== 'undefined' && window.location) {
        return window.location.origin;
    }
    return 'https://www.vizzarowallpaper.com';
}

const defaultCollections: Collection[] = [
    {
        id: 'geometrico',
        name: 'Geométrico',
        image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=600&fit=crop&auto=format&q=80',
        category: 'Geométrico',
        featured: true,
    },
    {
        id: 'floral',
        name: 'Floral',
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop&auto=format&q=80',
        category: 'Floral',
        featured: true,
    },
    {
        id: 'textura',
        name: 'Textura',
        image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&h=600&fit=crop&auto=format&q=80',
        category: 'Textura',
        featured: false,
    },
];

// Helper to save collections
const saveCollectionsToStorageAndApi = async (collectionsData: Collection[], adminToken?: string): Promise<boolean> => {
    try {
        const tokenToUse = adminToken || process.env.EXPO_PUBLIC_ADMIN_TOKEN || '';
        const API_BASE_URL = getApiBaseUrl();

        if (API_BASE_URL) {
            const apiUrl = `${API_BASE_URL}/api/collections/update`;
            console.log('[useCollectionsStore] Syncing to API:', apiUrl);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            let response;
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        collections: collectionsData,
                        adminToken: tokenToUse
                    }),
                    signal: controller.signal,
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error('[useCollectionsStore] Fetch error:', fetchError);

                if (fetchError instanceof Error) {
                    if (fetchError.name === 'AbortError') {
                        throw new Error('⏱️ Tiempo de espera agotado.\n\nEl servidor no respondió a tiempo. Verifica tu conexión a internet.');
                    }

                    if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('Network request failed')) {
                        // Silently failing API in some contexts might be better but here we throw to let caller handle
                        // But context swallowed it partially? Context re-threw it.
                        throw new Error('🌐 Error de conexión\n\nNo se pudo conectar al servidor. Verifica tu conexión.');
                    }
                }
                throw new Error('Error de red: ' + (fetchError instanceof Error ? fetchError.message : 'Desconocido'));
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[useCollectionsStore] API error response:', response.status, errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }

                if (errorData.needsConfig) {
                    throw new Error('⚠️ Base de datos no configurada\n\nPor favor configura Vercel KV.');
                }

                if (response.status === 401) {
                    throw new Error('🔒 No autorizado\n\nToken de administrador inválido.');
                }

                throw new Error(errorData.error || `Error del servidor (${response.status})`);
            }

            const data = await response.json();
            console.log('[useCollectionsStore] Synced to API successfully:', data);

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collectionsData));
            console.log('[useCollectionsStore] Saved to AsyncStorage');
        } else {
            console.log('[useCollectionsStore] No API URL configured, saving only to local storage');
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collectionsData));
        }
        return true;
    } catch (error) {
        console.error('[useCollectionsStore] Error saving collections:', error);
        throw error;
    }
};

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
    collections: [],
    isLoading: true,
    error: null,

    initialize: async () => {
        // Check if duplicate initialization? 
        // Just load collections
        await get().loadCollections();
    },

    loadCollections: async (forceRefresh = false) => {
        try {
            set({ isLoading: true, error: null });
            const API_BASE_URL = getApiBaseUrl();
            console.log('[useCollectionsStore] Loading collections... (forceRefresh:', forceRefresh, ')');

            if (API_BASE_URL) {
                try {
                    console.log('[useCollectionsStore] Attempting to load from API:', `${API_BASE_URL}/api/collections/get`);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const response = await fetch(`${API_BASE_URL}/api/collections/get?t=${Date.now()}`, {
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
                        console.log('[useCollectionsStore] Loaded from API:', data.collections?.length || 0, 'items');

                        if (data.success && data.collections) {
                            set({ collections: data.collections, isLoading: false });
                            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.collections));
                            return;
                        }
                    } else {
                        console.warn('[useCollectionsStore] API returned error:', response.status);
                    }
                } catch (apiError) {
                    console.warn('[useCollectionsStore] API fetch failed, trying fallback:', apiError);
                }
            } else {
                console.log('[useCollectionsStore] No API URL configured, using local storage mode');
            }

            if (!forceRefresh) {
                console.log('[useCollectionsStore] Loading from AsyncStorage...');
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    console.log('[useCollectionsStore] Loaded from storage:', parsed.length, 'items');
                    set({ collections: parsed, isLoading: false });
                    return;
                }
            }

            console.log('[useCollectionsStore] Using default collections:', defaultCollections.length, 'items');
            set({ collections: defaultCollections, isLoading: false });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCollections));

        } catch (error) {
            console.error('[useCollectionsStore] Error loading collections:', error);
            set({ error: 'Error al cargar las colecciones', collections: defaultCollections, isLoading: false });
        }
    },

    addCollection: async (newCollection, adminToken) => {
        try {
            console.log('[useCollectionsStore] Adding new collection:', newCollection.id);
            const { collections } = get();
            const updatedCollections = [...collections, newCollection];
            await saveCollectionsToStorageAndApi(updatedCollections, adminToken);
            set({ collections: updatedCollections });
            console.log('[useCollectionsStore] Collection added successfully');
            return true;
        } catch (error) {
            console.error('[useCollectionsStore] Error adding collection:', error);
            return false;
        }
    },

    updateCollection: async (updatedCollection, adminToken) => {
        try {
            const { collections } = get();
            const updatedCollections = collections.map(collection =>
                collection.id === updatedCollection.id ? updatedCollection : collection
            );
            await saveCollectionsToStorageAndApi(updatedCollections, adminToken);
            set({ collections: updatedCollections });
            console.log('[useCollectionsStore] Collection updated successfully:', updatedCollection.id);
            return true;
        } catch (error) {
            console.error('[useCollectionsStore] Error updating collection:', error);
            return false;
        }
    },

    deleteCollection: async (collectionId, adminToken) => {
        try {
            const { collections } = get();
            const updatedCollections = collections.filter(collection => collection.id !== collectionId);
            await saveCollectionsToStorageAndApi(updatedCollections, adminToken);
            set({ collections: updatedCollections });
            console.log('[useCollectionsStore] Collection deleted successfully');
            return true;
        } catch (error) {
            console.error('[useCollectionsStore] Error deleting collection:', error);
            return false;
        }
    },

    refetchCollections: async () => {
        console.log('[useCollectionsStore] Manual refetch requested');
        await get().loadCollections(true);
    }
}));
