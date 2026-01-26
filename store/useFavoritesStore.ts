import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallpaper } from '@/constants/wallpapers';
import { useAuthStore } from './useAuthStore';

const FAVORITES_STORAGE_KEY = 'favorites_projects';
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
    error: string | null;

    // Actions
    initialize: () => Promise<void>;
    loadFavorites: () => Promise<void>;
    addToFavorites: (name: string, roomType: string, wallpaper: Wallpaper, userPhoto?: string, notes?: string) => Promise<FavoriteProject | null>;
    updateProject: (projectId: string, updates: Partial<FavoriteProject>) => Promise<boolean>;
    addWallpaperToProject: (projectId: string, wallpaper: Wallpaper) => Promise<boolean>;
    removeWallpaperFromProject: (projectId: string, wallpaperId: string) => Promise<boolean>;
    removeFromFavorites: (projectId: string) => Promise<boolean>;

    // Selectors (as functions since Zustand state is accessible)
    getProjectById: (projectId: string) => FavoriteProject | undefined;
    getProjectsByRoom: (roomType: string) => FavoriteProject[];

    // Quick Actions for UI
    isFavorite: (wallpaperId: string) => boolean;
    toggleFavorite: (wallpaper: Wallpaper) => Promise<boolean>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
    favoriteProjects: [],
    isLoading: true,
    error: null,

    initialize: async () => {
        await get().loadFavorites();
    },

    loadFavorites: async () => {
        const user = useAuthStore.getState().user;
        try {
            console.log('[FavoritesStore] Loading favorites...');

            if (API_BASE_URL) {
                try {
                    const queryParams = user?.id ? `?userId=${user.id}` : '';
                    console.log('[FavoritesStore] Fetching from API:', `${API_BASE_URL}/api/favorites/get${queryParams}`);

                    const response = await fetch(`${API_BASE_URL}/api/favorites/get${queryParams}&t=${Date.now()}`, {
                        method: 'GET',
                        headers: {
                            'Cache-Control': 'no-store, no-cache, must-revalidate',
                            'Pragma': 'no-cache',
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('[FavoritesStore] Loaded from API:', data.favorites?.length || 0, 'projects');
                        if (data.success && data.favorites) {
                            set({ favoriteProjects: data.favorites, isLoading: false });
                            await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(data.favorites));
                            return;
                        }
                    } else {
                        console.warn('[FavoritesStore] API returned error:', response.status);
                    }
                } catch (apiError) {
                    console.warn('[FavoritesStore] API fetch failed, trying local storage:', apiError);
                }
            }

            console.log('[FavoritesStore] Loading from local storage...');
            const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
            if (stored) {
                const parsedFavorites = JSON.parse(stored);
                set({ favoriteProjects: parsedFavorites, isLoading: false });
                console.log('[FavoritesStore] Loaded from storage:', parsedFavorites.length, 'projects');
                return;
            }

            set({ isLoading: false });
        } catch (error) {
            console.error('[FavoritesStore] Error loading favorites:', error);
            set({ error: 'Error loading favorites', isLoading: false });
        }
    },

    addToFavorites: async (name, roomType, wallpaper, userPhoto, notes) => {
        const user = useAuthStore.getState().user;
        try {
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

            const updatedProjects = [...get().favoriteProjects, newProject];
            set({ favoriteProjects: updatedProjects });

            await saveFavoritesToStorageAndApi(updatedProjects, user?.id);
            console.log('Project added to favorites:', newProject.name);
            return newProject;
        } catch (error) {
            console.error('Error adding to favorites:', error);
            return null;
        }
    },

    updateProject: async (projectId, updates) => {
        const user = useAuthStore.getState().user;
        try {
            const updatedProjects = get().favoriteProjects.map(project =>
                project.id === projectId
                    ? { ...project, ...updates, dateModified: new Date().toISOString() }
                    : project
            );

            set({ favoriteProjects: updatedProjects });
            await saveFavoritesToStorageAndApi(updatedProjects, user?.id);
            console.log('Project updated:', projectId);
            return true;
        } catch (error) {
            console.error('Error updating project:', error);
            return false;
        }
    },

    addWallpaperToProject: async (projectId, wallpaper) => {
        const user = useAuthStore.getState().user;
        try {
            let wallpaperExists = false;
            const updatedProjects = get().favoriteProjects.map(project => {
                if (project.id === projectId) {
                    wallpaperExists = project.wallpapers.some(w => w.id === wallpaper.id);
                    if (wallpaperExists) {
                        console.log('Wallpaper already exists in project');
                        return project;
                    }
                    return {
                        ...project,
                        wallpapers: [...project.wallpapers, wallpaper],
                        dateModified: new Date().toISOString(),
                    };
                }
                return project;
            });

            if (wallpaperExists) return true; // Or false depending on desired behavior, context returned returns true/false but logged "exists". Context actually returned the project (implicit return in map) and continued to save. But wait, in map it returned `project` unchanged. Then saved.
            // In original context: if wallpaperExists, it returned project unchanged. Then set state with updatedProjects. Then saved updatedProjects. So it was a no-op effectively but treated as success or at least no error. 
            // But `addWallpaperToProject` returned `true` at the end unless error. 
            // If no change, we probably shouldn't trigger save.

            // Let's refine:
            const project = get().favoriteProjects.find(p => p.id === projectId);
            if (project && project.wallpapers.some(w => w.id === wallpaper.id)) {
                return false;
            }

            set({ favoriteProjects: updatedProjects });
            await saveFavoritesToStorageAndApi(updatedProjects, user?.id);
            console.log('Wallpaper added to project:', projectId);
            return true;
        } catch (error) {
            console.error('Error adding wallpaper to project:', error);
            return false;
        }
    },

    removeWallpaperFromProject: async (projectId, wallpaperId) => {
        const user = useAuthStore.getState().user;
        try {
            let cannotRemove = false;
            const updatedProjects = get().favoriteProjects.map(project => {
                if (project.id === projectId) {
                    const updatedWallpapers = project.wallpapers.filter(w => w.id !== wallpaperId);
                    return {
                        ...project,
                        wallpapers: updatedWallpapers,
                        dateModified: new Date().toISOString(),
                    };
                }
                return project;
            }).filter(project => project.wallpapers.length > 0); // Auto-delete empty projects for cleanliness

            set({ favoriteProjects: updatedProjects });
            await saveFavoritesToStorageAndApi(updatedProjects, user?.id);
            console.log('Wallpaper removed from project:', projectId);
            return true;
        } catch (error) {
            console.error('Error removing wallpaper from project:', error);
            return false;
        }
    },

    removeFromFavorites: async (projectId) => {
        const user = useAuthStore.getState().user;
        try {
            const updatedProjects = get().favoriteProjects.filter(project => project.id !== projectId);
            set({ favoriteProjects: updatedProjects });

            await saveFavoritesToStorageAndApi(updatedProjects, user?.id);
            console.log('Project removed from favorites:', projectId);
            return true;
        } catch (error) {
            console.error('Error removing from favorites:', error);
            return false;
        }
    },

    getProjectById: (projectId) => {
        return get().favoriteProjects.find(project => project.id === projectId);
    },

    getProjectsByRoom: (roomType) => {
        return get().favoriteProjects.filter(project =>
            project.roomType.toLowerCase() === roomType.toLowerCase()
        );
    },

    isFavorite: (wallpaperId: string) => {
        return get().favoriteProjects.some(p => p.wallpapers.some(w => w.id === wallpaperId));
    },

    toggleFavorite: async (wallpaper: Wallpaper) => {
        const { isFavorite, favoriteProjects, addToFavorites, removeWallpaperFromProject } = get();

        if (isFavorite(wallpaper.id)) {
            // Remove from ALL projects
            // Note: This might be aggressive if user organized it, but for a simple toggle it's expected behavior
            // "Unhearting" usually means "I don't want this anymore".
            const projectsWithItem = favoriteProjects.filter(p => p.wallpapers.some(w => w.id === wallpaper.id));
            for (const p of projectsWithItem) {
                await get().removeWallpaperFromProject(p.id, wallpaper.id);
            }
            return false; // Now not favorite
        } else {
            // Add to "My Favorites" (Default)
            let defaultProject = favoriteProjects.find(p => p.name === 'My Favorites');

            if (defaultProject) {
                await get().addWallpaperToProject(defaultProject.id, wallpaper);
            } else {
                await get().addToFavorites('My Favorites', 'General', wallpaper);
            }
            return true; // Now favorite
        }
    }
}));

// Helper function outside the hook
async function saveFavoritesToStorageAndApi(projects: FavoriteProject[], userId?: string) {
    try {
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(projects));

        if (API_BASE_URL) {
            try {
                console.log('[FavoritesStore] Syncing to API...');
                const response = await fetch(`${API_BASE_URL}/api/favorites/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        favorites: projects,
                        userId: userId
                    }),
                });

                if (response.ok) {
                    console.log('[FavoritesStore] Synced to API successfully');
                } else {
                    console.warn('[FavoritesStore] API sync failed:', response.status);
                }
            } catch (apiError) {
                console.warn('[FavoritesStore] API sync error:', apiError);
            }
        }

        console.log('[FavoritesStore] Favorites saved successfully');
    } catch (error) {
        console.error('[FavoritesStore] Error saving favorites:', error);
    }
}
