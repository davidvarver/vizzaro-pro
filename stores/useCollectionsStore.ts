import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const COLLECTIONS_STORAGE_KEY = 'featured_collections';

export interface Collection {
    id: string;
    name: string;
    image: string;
    category: string;
    featured: boolean;
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

interface CollectionsState {
    collections: Collection[];
    isLoading: boolean;
    error: string | null;

    loadCollections: (forceRefresh?: boolean) => Promise<void>;
    addCollection: (newCollection: Collection, adminToken?: string) => Promise<boolean>;
    updateCollection: (updatedCollection: Collection, adminToken?: string) => Promise<boolean>;
    deleteCollection: (collectionId: string, adminToken?: string) => Promise<boolean>;
    refetchCollections: () => Promise<void>;
}

async function saveCollections(collections: Collection[], adminToken?: string) {
    if (API_BASE_URL && adminToken) {
        try {
            await fetch(`${API_BASE_URL}/api/collections/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collections, adminToken })
            });
        } catch (e) {
            console.warn('API sync failed', e);
        }
    }
    await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
}

export const useCollectionsStore = create<CollectionsState>()(
    persist(
        (set, get) => ({
            collections: [],
            isLoading: false,
            error: null,

            loadCollections: async (forceRefresh = false) => {
                set({ isLoading: true, error: null });
                try {
                    if (API_BASE_URL) {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/collections/get?t=${Date.now()}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.success && data.collections) {
                                    set({ collections: data.collections, isLoading: false });
                                    await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(data.collections));
                                    return;
                                }
                            }
                        } catch (e) {
                            console.warn('API collections load failed, using local:', e);
                        }
                    }

                    if (!forceRefresh) {
                        const stored = await AsyncStorage.getItem(COLLECTIONS_STORAGE_KEY);
                        if (stored) {
                            set({ collections: JSON.parse(stored), isLoading: false });
                            return;
                        }
                    }

                    set({ collections: defaultCollections, isLoading: false });
                    await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(defaultCollections));
                } catch (e) {
                    set({ error: 'Error loading collections', collections: defaultCollections, isLoading: false });
                }
            },

            addCollection: async (newCollection, adminToken) => {
                const { collections } = get();
                const newCollections = [...collections, newCollection];
                set({ collections: newCollections });
                await saveCollections(newCollections, adminToken);
                return true;
            },

            updateCollection: async (updatedCollection, adminToken) => {
                const { collections } = get();
                const newCollections = collections.map(c => c.id === updatedCollection.id ? updatedCollection : c);
                set({ collections: newCollections });
                await saveCollections(newCollections, adminToken);
                return true;
            },

            deleteCollection: async (collectionId, adminToken) => {
                const { collections } = get();
                const newCollections = collections.filter(c => c.id !== collectionId);
                set({ collections: newCollections });
                await saveCollections(newCollections, adminToken);
                return true;
            },

            refetchCollections: () => get().loadCollections(true)
        }),
        {
            name: 'collections_store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
