import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallpaper } from '@/constants/wallpapers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

export interface FavoriteProject {
    id: string;
    name: string;
    roomType: string;
    wallpapers: Wallpaper[];
    userPhoto?: string;
    dateCreated: string;
    dateModified: string;
    notes?: string;
}

interface FavoritesState {
    favoriteProjects: FavoriteProject[];
    isLoading: boolean;

    loadFavorites: (userId?: string) => Promise<void>;
    addToFavorites: (
        name: string,
        roomType: string,
        wallpaper: Wallpaper,
        userId?: string,
        userPhoto?: string,
        notes?: string
    ) => Promise<FavoriteProject | null>;
    updateProject: (projectId: string, updates: Partial<FavoriteProject>, userId?: string) => Promise<boolean>;
    addWallpaperToProject: (projectId: string, wallpaper: Wallpaper, userId?: string) => Promise<boolean>;
    removeWallpaperFromProject: (projectId: string, wallpaperId: string, userId?: string) => Promise<boolean>;
    removeFromFavorites: (projectId: string, userId?: string) => Promise<boolean>;
    getProjectById: (projectId: string) => FavoriteProject | undefined;
    getProjectsByRoom: (roomType: string) => FavoriteProject[];
}

async function syncFavorites(favorites: FavoriteProject[], userId?: string) {
    if (userId && API_BASE_URL) {
        try {
            await fetch(`${API_BASE_URL}/api/favorites/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ favorites, userId }),
            });
        } catch (e) {
            console.warn('Sync failed', e);
        }
    }
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favoriteProjects: [],
            isLoading: false,

            loadFavorites: async (userId) => {
                set({ isLoading: true });
                try {
                    // Try API
                    if (API_BASE_URL) {
                        const query = userId ? `?userId=${userId}` : '';
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/favorites/get${query}&t=${Date.now()}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.success && data.favorites) {
                                    set({ favoriteProjects: data.favorites, isLoading: false });
                                    return;
                                }
                            }
                        } catch (e) { console.warn(e); }
                    }
                    // Fallback handled by persist middleware automatically?
                    // Actually persist middleware handles rehydration on init. 
                    // So if we fail API, we just keep what we have (or what persist loaded).
                    // But we typically want to specifically load for *this* user?
                    // The Context logic was loading from storage explicitly.
                    // With Persist middleware, it loads on mount.
                    // We can just rely on that for offline, and API for online.
                    set({ isLoading: false });
                } catch (e) {
                    set({ isLoading: false });
                }
            },

            addToFavorites: async (name, roomType, wallpaper, userId, userPhoto, notes) => {
                const newProject: FavoriteProject = {
                    id: Date.now().toString(),
                    name,
                    roomType,
                    wallpapers: [wallpaper],
                    userPhoto,
                    dateCreated: new Date().toISOString(),
                    dateModified: new Date().toISOString(),
                    notes,
                };

                const { favoriteProjects } = get();
                const newProjects = [...favoriteProjects, newProject];
                set({ favoriteProjects: newProjects });

                await syncFavorites(newProjects, userId);
                return newProject;
            },

            updateProject: async (projectId, updates, userId) => {
                const { favoriteProjects } = get();
                const newProjects = favoriteProjects.map(p =>
                    p.id === projectId ? { ...p, ...updates, dateModified: new Date().toISOString() } : p
                );
                set({ favoriteProjects: newProjects });
                await syncFavorites(newProjects, userId);
                return true;
            },

            addWallpaperToProject: async (projectId, wallpaper, userId) => {
                const { favoriteProjects } = get();
                let changed = false;
                const newProjects = favoriteProjects.map(p => {
                    if (p.id === projectId && !p.wallpapers.some(w => w.id === wallpaper.id)) {
                        changed = true;
                        return { ...p, wallpapers: [...p.wallpapers, wallpaper], dateModified: new Date().toISOString() };
                    }
                    return p;
                });

                if (changed) {
                    set({ favoriteProjects: newProjects });
                    await syncFavorites(newProjects, userId);
                    return true;
                }
                return false;
            },

            removeWallpaperFromProject: async (projectId, wallpaperId, userId) => {
                const { favoriteProjects } = get();
                let changed = false;
                const newProjects = favoriteProjects.map(p => {
                    if (p.id === projectId) {
                        const newWallpapers = p.wallpapers.filter(w => w.id !== wallpaperId);
                        if (newWallpapers.length > 0 && newWallpapers.length !== p.wallpapers.length) {
                            changed = true;
                            return { ...p, wallpapers: newWallpapers, dateModified: new Date().toISOString() };
                        }
                    }
                    return p;
                });

                if (changed) {
                    set({ favoriteProjects: newProjects });
                    await syncFavorites(newProjects, userId);
                    return true;
                }
                return false;
            },

            removeFromFavorites: async (projectId, userId) => {
                const { favoriteProjects } = get();
                const newProjects = favoriteProjects.filter(p => p.id !== projectId);
                set({ favoriteProjects: newProjects });
                await syncFavorites(newProjects, userId);
                return true;
            },

            getProjectById: (id) => get().favoriteProjects.find(p => p.id === id),
            getProjectsByRoom: (room) => get().favoriteProjects.filter(p => p.roomType.toLowerCase() === room.toLowerCase()),

        }),
        {
            name: 'favorites_store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
