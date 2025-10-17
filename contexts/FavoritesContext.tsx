import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Wallpaper } from '@/constants/wallpapers';

const FAVORITES_STORAGE_KEY = 'favorites_projects';

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
  const [favoriteProjects, setFavoriteProjects] = useState<FavoriteProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveFavorites = useCallback(async (projects: FavoriteProject[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(projects));
      console.log('Favorites saved successfully');
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored);
        setFavoriteProjects(parsedFavorites);
        console.log('Favorites loaded:', parsedFavorites.length, 'projects');
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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