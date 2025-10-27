import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Wallpaper } from '@/constants/wallpapers';
import { useAuth } from './AuthContext';

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

export const [FavoritesProvider, useFavorites] = createContextHook(() => {
  const { user } = useAuth();
  const [favoriteProjects, setFavoriteProjects] = useState<FavoriteProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveFavorites = useCallback(async (projects: FavoriteProject[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(projects));
      
      if (API_BASE_URL) {
        try {
          console.log('[FavoritesContext] Syncing to API...');
          const response = await fetch(`${API_BASE_URL}/api/favorites/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              favorites: projects,
              userId: user?.id 
            }),
          });

          if (response.ok) {
            console.log('[FavoritesContext] Synced to API successfully');
          } else {
            console.warn('[FavoritesContext] API sync failed:', response.status);
          }
        } catch (apiError) {
          console.warn('[FavoritesContext] API sync error:', apiError);
        }
      }
      
      console.log('[FavoritesContext] Favorites saved successfully');
    } catch (error) {
      console.error('[FavoritesContext] Error saving favorites:', error);
    }
  }, [user]);

  const loadFavorites = useCallback(async () => {
    try {
      console.log('[FavoritesContext] Loading favorites...');
      
      if (API_BASE_URL) {
        try {
          const queryParams = user?.id ? `?userId=${user.id}` : '';
          console.log('[FavoritesContext] Fetching from API:', `${API_BASE_URL}/api/favorites/get${queryParams}`);
          
          const response = await fetch(`${API_BASE_URL}/api/favorites/get${queryParams}&t=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache',
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[FavoritesContext] Loaded from API:', data.favorites?.length || 0, 'projects');
            if (data.success && data.favorites) {
              setFavoriteProjects(data.favorites);
              await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(data.favorites));
              return;
            }
          } else {
            console.warn('[FavoritesContext] API returned error:', response.status);
          }
        } catch (apiError) {
          console.warn('[FavoritesContext] API fetch failed, trying local storage:', apiError);
        }
      }
      
      console.log('[FavoritesContext] Loading from local storage...');
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored);
        setFavoriteProjects(parsedFavorites);
        console.log('[FavoritesContext] Loaded from storage:', parsedFavorites.length, 'projects');
      }
    } catch (error) {
      console.error('[FavoritesContext] Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addToFavorites = useCallback(async (
    name: string,
    roomType: string,
    wallpaper: Wallpaper,
    userPhoto?: string,
    notes?: string
  ) => {
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

      let updatedProjects: FavoriteProject[] = [];
      setFavoriteProjects(currentProjects => {
        updatedProjects = [...currentProjects, newProject];
        return updatedProjects;
      });

      await saveFavorites(updatedProjects);
      console.log('Project added to favorites:', newProject.name);
      return newProject;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return null;
    }
  }, [saveFavorites]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<FavoriteProject>) => {
    try {
      let updatedProjects: FavoriteProject[] = [];
      setFavoriteProjects(currentProjects => {
        updatedProjects = currentProjects.map(project =>
          project.id === projectId
            ? { ...project, ...updates, dateModified: new Date().toISOString() }
            : project
        );
        return updatedProjects;
      });

      await saveFavorites(updatedProjects);
      console.log('Project updated:', projectId);
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  }, [saveFavorites]);

  const addWallpaperToProject = useCallback(async (projectId: string, wallpaper: Wallpaper) => {
    try {
      let updatedProjects: FavoriteProject[] = [];
      setFavoriteProjects(currentProjects => {
        updatedProjects = currentProjects.map(project => {
          if (project.id === projectId) {
            const wallpaperExists = project.wallpapers.some(w => w.id === wallpaper.id);
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
        return updatedProjects;
      });

      await saveFavorites(updatedProjects);
      console.log('Wallpaper added to project:', projectId);
      return true;
    } catch (error) {
      console.error('Error adding wallpaper to project:', error);
      return false;
    }
  }, [saveFavorites]);

  const removeWallpaperFromProject = useCallback(async (projectId: string, wallpaperId: string) => {
    try {
      let updatedProjects: FavoriteProject[] = [];
      setFavoriteProjects(currentProjects => {
        updatedProjects = currentProjects.map(project => {
          if (project.id === projectId) {
            const updatedWallpapers = project.wallpapers.filter(w => w.id !== wallpaperId);
            if (updatedWallpapers.length === 0) {
              console.log('Cannot remove last wallpaper from project');
              return project;
            }
            return {
              ...project,
              wallpapers: updatedWallpapers,
              dateModified: new Date().toISOString(),
            };
          }
          return project;
        });
        return updatedProjects;
      });

      await saveFavorites(updatedProjects);
      console.log('Wallpaper removed from project:', projectId);
      return true;
    } catch (error) {
      console.error('Error removing wallpaper from project:', error);
      return false;
    }
  }, [saveFavorites]);

  const removeFromFavorites = useCallback(async (projectId: string) => {
    try {
      let updatedProjects: FavoriteProject[] = [];
      setFavoriteProjects(currentProjects => {
        updatedProjects = currentProjects.filter(project => project.id !== projectId);
        return updatedProjects;
      });

      await saveFavorites(updatedProjects);
      console.log('Project removed from favorites:', projectId);
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
  }, [saveFavorites]);

  const getProjectById = useCallback((projectId: string) => {
    return favoriteProjects.find(project => project.id === projectId);
  }, [favoriteProjects]);

  const getProjectsByRoom = useCallback((roomType: string) => {
    return favoriteProjects.filter(project => 
      project.roomType.toLowerCase() === roomType.toLowerCase()
    );
  }, [favoriteProjects]);

  return useMemo(() => ({
    favoriteProjects,
    isLoading,
    addToFavorites,
    updateProject,
    addWallpaperToProject,
    removeWallpaperFromProject,
    removeFromFavorites,
    getProjectById,
    getProjectsByRoom,
  }), [
    favoriteProjects,
    isLoading,
    addToFavorites,
    updateProject,
    addWallpaperToProject,
    removeWallpaperFromProject,
    removeFromFavorites,
    getProjectById,
    getProjectsByRoom,
  ]);
});