import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Wallpaper, wallpapers as defaultWallpapers } from '@/constants/wallpapers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const STORAGE_KEY = 'wallpapers_catalog';

export const [WallpapersProvider, useWallpapers] = createContextHook(() => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallpapers = useCallback(async (forceRefresh = false) => {
    try {
      console.log('[WallpapersContext] Loading catalog... (forceRefresh:', forceRefresh, ')');
      setError(null);
      setIsLoading(true);
      
      if (API_BASE_URL) {
        try {
          console.log('[WallpapersContext] Attempting to load from API:', `${API_BASE_URL}/api/catalog/get`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const response = await fetch(`${API_BASE_URL}/api/catalog/get?t=${Date.now()}`, {
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
            console.log('[WallpapersContext] Loaded from API:', data.catalog?.length || 0, 'items');
            console.log('[WallpapersContext] API timestamp:', data.timestamp);
            
            if (data.success && data.catalog && Array.isArray(data.catalog)) {
              const validCatalog = data.catalog.filter((item: any) => 
                item && typeof item === 'object' && item.id && item.name && typeof item.price === 'number'
              );
              console.log('[WallpapersContext] Valid items after filtering:', validCatalog.length);
              
              if (validCatalog.length > 0) {
                setWallpapers(validCatalog);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validCatalog));
                await AsyncStorage.setItem(STORAGE_KEY + '_timestamp', data.timestamp?.toString() || Date.now().toString());
                setIsLoading(false);
                return;
              } else {
                console.warn('[WallpapersContext] No valid items in catalog, using defaults');
              }
            }
          } else {
            console.warn('[WallpapersContext] API returned error:', response.status);
            const errorText = await response.text();
            console.warn('[WallpapersContext] Error details:', errorText);
          }
        } catch (apiError) {
          console.warn('[WallpapersContext] API fetch failed, trying fallback:', apiError);
        }
      } else {
        console.log('[WallpapersContext] No API URL configured, using local storage mode');
      }
      
      if (!forceRefresh) {
        console.log('[WallpapersContext] Loading from AsyncStorage...');
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[WallpapersContext] Loaded from storage:', parsed.length, 'items');
          setWallpapers(parsed);
          return;
        }
      }
      
      console.log('[WallpapersContext] Using default wallpapers:', defaultWallpapers.length, 'items');
      setWallpapers(defaultWallpapers);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultWallpapers));
      
    } catch (error) {
      console.error('[WallpapersContext] Error loading wallpapers:', error);
      setError('Error al cargar el catálogo');
      setWallpapers(defaultWallpapers);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveWallpapers = useCallback(async (wallpapersData: Wallpaper[], authToken?: string): Promise<boolean> => {
    try {
      console.log('[WallpapersContext] Saving catalog with', wallpapersData.length, 'items...');
      
      if (!authToken) {
        throw new Error('No hay token de autenticación. Por favor inicia sesión.');
      }
      
      console.log('[WallpapersContext] Using auth token:', !!authToken);
      
      if (API_BASE_URL) {
        const apiUrl = `${API_BASE_URL}/api/catalog/update`;
        console.log('[WallpapersContext] Syncing to API:', apiUrl);
        
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
          console.error('[WallpapersContext] Fetch error:', fetchError);
          
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
          console.error('[WallpapersContext] API error response:', response.status, errorText);
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
        console.log('[WallpapersContext] Synced to API successfully:', data);
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallpapersData));
        await AsyncStorage.setItem(STORAGE_KEY + '_timestamp', data.timestamp?.toString() || Date.now().toString());
        console.log('[WallpapersContext] Saved to AsyncStorage');
        
        setWallpapers(wallpapersData);
      } else {
        console.log('[WallpapersContext] No API URL configured, saving only to local storage');
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallpapersData));
        await AsyncStorage.setItem(STORAGE_KEY + '_timestamp', Date.now().toString());
        console.log('[WallpapersContext] Saved to AsyncStorage');
        
        setWallpapers(wallpapersData);
      }
      
      return true;
    } catch (error) {
      console.error('[WallpapersContext] Error saving wallpapers:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    loadWallpapers();
  }, [loadWallpapers]);

  const updateWallpaper = useCallback(async (updatedWallpaper: Wallpaper, adminToken?: string) => {
    try {
      const updatedWallpapers = wallpapers.map(wallpaper =>
        wallpaper.id === updatedWallpaper.id ? updatedWallpaper : wallpaper
      );
      
      await saveWallpapers(updatedWallpapers, adminToken);
      console.log('[WallpapersContext] Wallpaper updated successfully:', updatedWallpaper.id);
      return true;
    } catch (error) {
      console.error('[WallpapersContext] Error updating wallpaper:', error);
      return false;
    }
  }, [wallpapers, saveWallpapers]);

  const addWallpaper = useCallback(async (newWallpaper: Wallpaper, adminToken?: string) => {
    try {
      console.log('[WallpapersContext] Adding new wallpaper:', newWallpaper.id);
      
      const updatedWallpapers = [...wallpapers, newWallpaper];
      
      await saveWallpapers(updatedWallpapers, adminToken);
      console.log('[WallpapersContext] Wallpaper added successfully');
      
      return true;
    } catch (error) {
      console.error('[WallpapersContext] Error adding wallpaper:', error);
      return false;
    }
  }, [wallpapers, saveWallpapers]);

  const addMultipleWallpapers = useCallback(async (newWallpapers: Wallpaper[], adminToken?: string) => {
    try {
      console.log('[WallpapersContext] Adding multiple wallpapers:', newWallpapers.length);
      
      const updatedWallpapers = [...wallpapers, ...newWallpapers];
      
      await saveWallpapers(updatedWallpapers, adminToken);
      console.log('[WallpapersContext] Multiple wallpapers added successfully');
      
      return true;
    } catch (error) {
      console.error('[WallpapersContext] Error adding multiple wallpapers:', error);
      return false;
    }
  }, [wallpapers, saveWallpapers]);

  const replaceAllWallpapers = useCallback(async (newWallpapers: Wallpaper[], adminToken?: string) => {
    try {
      console.log('[WallpapersContext] Replacing all wallpapers with:', newWallpapers.length, 'items');
      
      await saveWallpapers(newWallpapers, adminToken);
      console.log('[WallpapersContext] All wallpapers replaced successfully');
      
      return true;
    } catch (error) {
      console.error('[WallpapersContext] Error replacing wallpapers:', error);
      return false;
    }
  }, [saveWallpapers]);

  const deleteWallpaper = useCallback(async (wallpaperId: string, adminToken?: string) => {
    try {
      const updatedWallpapers = wallpapers.filter(wallpaper => wallpaper.id !== wallpaperId);
      
      await saveWallpapers(updatedWallpapers, adminToken);
      console.log('[WallpapersContext] Wallpaper deleted successfully');
      return true;
    } catch (error) {
      console.error('[WallpapersContext] Error deleting wallpaper:', error);
      return false;
    }
  }, [wallpapers, saveWallpapers]);

  const getWallpaperById = useCallback((id: string) => {
    return wallpapers.find(wallpaper => wallpaper.id === id);
  }, [wallpapers]);

  const refetchWallpapers = useCallback(() => {
    console.log('[WallpapersContext] Manual refetch requested');
    setIsLoading(true);
    return loadWallpapers(true);
  }, [loadWallpapers]);

  return useMemo(() => ({
    wallpapers,
    isLoading,
    error,
    updateWallpaper,
    addWallpaper,
    addMultipleWallpapers,
    replaceAllWallpapers,
    deleteWallpaper,
    getWallpaperById,
    refetchWallpapers,
  }), [wallpapers, isLoading, error, updateWallpaper, addWallpaper, addMultipleWallpapers, replaceAllWallpapers, deleteWallpaper, getWallpaperById, refetchWallpapers]);
});
