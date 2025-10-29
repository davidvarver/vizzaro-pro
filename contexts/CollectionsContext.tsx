import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const STORAGE_KEY = 'featured_collections';

export interface Collection {
  id: string;
  name: string;
  image: string;
  colors: string[];
  category?: string;
  featured: boolean;
}

const defaultCollections: Collection[] = [
  {
    id: 'blanco-negro',
    name: 'Blanco & Negro Moderno',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=600&fit=crop&auto=format&q=80',
    colors: ['Blanco', 'Negro', 'Gris'],
    category: 'Geométrico',
    featured: true,
  },
  {
    id: 'textura-beige',
    name: 'Textura Beige Soft',
    image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&h=600&fit=crop&auto=format&q=80',
    colors: ['Beige', 'Crema'],
    category: 'Textura',
    featured: false,
  },
  {
    id: 'geometria-gold',
    name: 'Geometría Gold Line',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&auto=format&q=80',
    colors: ['Dorado', 'Negro'],
    category: 'Geométrico',
    featured: false,
  },
];

export const [CollectionsProvider, useCollections] = createContextHook(() => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = useCallback(async (forceRefresh = false) => {
    try {
      console.log('[CollectionsContext] Loading collections... (forceRefresh:', forceRefresh, ')');
      setError(null);
      
      if (API_BASE_URL) {
        try {
          console.log('[CollectionsContext] Attempting to load from API:', `${API_BASE_URL}/api/collections/get`);
          
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
            console.log('[CollectionsContext] Loaded from API:', data.collections?.length || 0, 'items');
            
            if (data.success && data.collections) {
              setCollections(data.collections);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.collections));
              return;
            }
          } else {
            console.warn('[CollectionsContext] API returned error:', response.status);
          }
        } catch (apiError) {
          console.warn('[CollectionsContext] API fetch failed, trying fallback:', apiError);
        }
      } else {
        console.log('[CollectionsContext] No API URL configured, using local storage mode');
      }
      
      if (!forceRefresh) {
        console.log('[CollectionsContext] Loading from AsyncStorage...');
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[CollectionsContext] Loaded from storage:', parsed.length, 'items');
          setCollections(parsed);
          return;
        }
      }
      
      console.log('[CollectionsContext] Using default collections:', defaultCollections.length, 'items');
      setCollections(defaultCollections);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCollections));
      
    } catch (error) {
      console.error('[CollectionsContext] Error loading collections:', error);
      setError('Error al cargar las colecciones');
      setCollections(defaultCollections);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCollections = useCallback(async (collectionsData: Collection[], adminToken?: string): Promise<boolean> => {
    try {
      console.log('[CollectionsContext] Saving collections with', collectionsData.length, 'items...');
      
      const tokenToUse = adminToken || process.env.EXPO_PUBLIC_ADMIN_TOKEN || 'vizzaro_admin_secret_2025';
      
      if (API_BASE_URL) {
        const apiUrl = `${API_BASE_URL}/api/collections/update`;
        console.log('[CollectionsContext] Syncing to API:', apiUrl);
        
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
          console.error('[CollectionsContext] Fetch error:', fetchError);
          
          if (fetchError instanceof Error) {
            if (fetchError.name === 'AbortError') {
              throw new Error('⏱️ Tiempo de espera agotado.\n\nEl servidor no respondió a tiempo. Verifica tu conexión a internet.');
            }
            
            if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('Network request failed')) {
              throw new Error('🌐 Error de conexión\n\nNo se pudo conectar al servidor. Verifica tu conexión.');
            }
          }
          
          throw new Error('Error de red: ' + (fetchError instanceof Error ? fetchError.message : 'Desconocido'));
        }
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[CollectionsContext] API error response:', response.status, errorText);
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
        console.log('[CollectionsContext] Synced to API successfully:', data);
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collectionsData));
        console.log('[CollectionsContext] Saved to AsyncStorage');
        
        setCollections(collectionsData);
      } else {
        console.log('[CollectionsContext] No API URL configured, saving only to local storage');
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(collectionsData));
        console.log('[CollectionsContext] Saved to AsyncStorage');
        
        setCollections(collectionsData);
      }
      
      return true;
    } catch (error) {
      console.error('[CollectionsContext] Error saving collections:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const addCollection = useCallback(async (newCollection: Collection, adminToken?: string) => {
    try {
      console.log('[CollectionsContext] Adding new collection:', newCollection.id);
      const updatedCollections = [...collections, newCollection];
      await saveCollections(updatedCollections, adminToken);
      console.log('[CollectionsContext] Collection added successfully');
      return true;
    } catch (error) {
      console.error('[CollectionsContext] Error adding collection:', error);
      return false;
    }
  }, [collections, saveCollections]);

  const updateCollection = useCallback(async (updatedCollection: Collection, adminToken?: string) => {
    try {
      const updatedCollections = collections.map(collection =>
        collection.id === updatedCollection.id ? updatedCollection : collection
      );
      await saveCollections(updatedCollections, adminToken);
      console.log('[CollectionsContext] Collection updated successfully:', updatedCollection.id);
      return true;
    } catch (error) {
      console.error('[CollectionsContext] Error updating collection:', error);
      return false;
    }
  }, [collections, saveCollections]);

  const deleteCollection = useCallback(async (collectionId: string, adminToken?: string) => {
    try {
      const updatedCollections = collections.filter(collection => collection.id !== collectionId);
      await saveCollections(updatedCollections, adminToken);
      console.log('[CollectionsContext] Collection deleted successfully');
      return true;
    } catch (error) {
      console.error('[CollectionsContext] Error deleting collection:', error);
      return false;
    }
  }, [collections, saveCollections]);

  const refetchCollections = useCallback(() => {
    console.log('[CollectionsContext] Manual refetch requested');
    setIsLoading(true);
    return loadCollections(true);
  }, [loadCollections]);

  return useMemo(() => ({
    collections,
    isLoading,
    error,
    addCollection,
    updateCollection,
    deleteCollection,
    refetchCollections,
  }), [collections, isLoading, error, addCollection, updateCollection, deleteCollection, refetchCollections]);
});
