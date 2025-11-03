import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, ScrollView, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Camera, FlipHorizontal, Circle, ArrowLeft, ImageIcon, Repeat } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useCart } from '@/contexts/CartContext';


export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { wallpaperId, source, projectId } = useLocalSearchParams<{ wallpaperId?: string; source?: string; projectId?: string }>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showLowLightWarning, setShowLowLightWarning] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);
  const { getWallpaperById, wallpapers } = useWallpapers();
  const { getProjectById } = useFavorites();
  const { cartItems } = useCart();
  
  console.log('=== CAMERA SCREEN MOUNTED ===');
  console.log('Wallpaper ID from params:', wallpaperId);
  console.log('Source:', source);
  console.log('Project ID from params:', projectId);
  
  const project = projectId ? getProjectById(projectId) : null;
  const wallpaper = wallpaperId ? getWallpaperById(wallpaperId) : null;
  
  console.log('Project found:', project ? { id: project.id, name: project.name } : 'null');
  console.log('Wallpaper found:', wallpaper ? { id: wallpaper.id, name: wallpaper.name } : 'null');
  
  const cartWallpapers = cartItems.map(item => item.wallpaper);
  
  const availableWallpapers = (source === 'favorite' || source === 'project') && project 
    ? wallpapers 
    : cartWallpapers.length > 0 
      ? cartWallpapers
      : wallpaper ? [wallpaper] : [];
  
  const [currentWallpaperIndex, setCurrentWallpaperIndex] = useState<number>(
    availableWallpapers.findIndex(w => w.id === wallpaperId) >= 0 
      ? availableWallpapers.findIndex(w => w.id === wallpaperId) 
      : 0
  );
  
  const currentWallpaper = availableWallpapers[currentWallpaperIndex] || wallpaper;
  
  const availableImages = currentWallpaper?.imageUrls && currentWallpaper.imageUrls.length > 0 
    ? currentWallpaper.imageUrls 
    : [currentWallpaper?.imageUrl].filter(Boolean);

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando cámara...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color={Colors.light.textSecondary} />
          <Text style={styles.permissionTitle}>Acceso a la Cámara</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a tu cámara para que puedas visualizar cómo se verá el papel tapiz en tu pared
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Permitir Acceso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  async function pickImage() {
    console.log('=== PICKING IMAGE FROM GALLERY ===');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      if (Platform.OS !== 'web') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar una foto.');
      }
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as ImagePicker.MediaTypeOptions,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const imageBase64 = result.assets[0].base64;
        if (imageBase64) {
          console.log('Image selected from gallery, base64 length:', imageBase64.length);
          
          const isLowLight = await detectLowLight(imageBase64);
          console.log('Low light detected:', isLowLight);
          setShowLowLightWarning(isLowLight);
          
          setUploadedImage(imageBase64);
          
          if (currentWallpaper) {
            setIsProcessing(true);
            await processImageWithAI(imageBase64, currentWallpaper);
            setIsProcessing(false);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'No se pudo seleccionar la imagen.');
      }
    }
  }
  
  async function takePicture() {
    console.log('=== TAKING PICTURE ===');
    console.log('Camera ref exists:', !!cameraRef.current);
    console.log('Camera ready:', isCameraReady);
    console.log('Wallpaper exists:', !!wallpaper);
    console.log('Wallpaper ID from params:', wallpaperId);
    console.log('Selected wallpaper:', wallpaper ? { id: wallpaper.id, name: wallpaper.name } : 'null');
    
    if (!cameraRef.current) {
      console.error('Camera ref is null');
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'No se pudo acceder a la cámara');
      }
      return;
    }
    
    if (!isCameraReady) {
      console.log('Camera not ready yet, waiting...');
      if (Platform.OS !== 'web') {
        Alert.alert('Espera', 'La cámara aún se está inicializando. Intenta de nuevo en un momento.');
      }
      return;
    }
    
    if (!currentWallpaper) {
      console.error('No wallpaper selected');
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'No se seleccionó papel tapiz. Por favor, regresa y selecciona un papel tapiz.');
      }
      return;
    }

    try {
      setIsProcessing(true);
      console.log('Starting photo capture...');
      
      if (Platform.OS === 'web') {
        console.log('Web platform detected, adding delay for camera stream...');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      console.log('Photo captured:', {
        hasUri: !!photo?.uri,
        hasBase64: !!photo?.base64,
        base64Length: photo?.base64?.length || 0
      });

      if (!photo || !photo.base64) {
        throw new Error('No se pudo capturar la imagen');
      }

      setUploadedImage(photo.base64);
      
      const isLowLight = await detectLowLight(photo.base64);
      console.log('Low light detected:', isLowLight);
      setShowLowLightWarning(isLowLight);
      
      console.log('Processing image with AI...');
      await processImageWithAI(photo.base64, currentWallpaper);
      
    } catch (error) {
      console.error('Error capturing photo:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'No se pudo capturar la foto. Inténtalo de nuevo.');
      }
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function reprocessWithDifferentWallpaper(wallpaperIndex: number) {
    console.log('=== REPROCESSING WITH DIFFERENT WALLPAPER ===');
    
    if (!uploadedImage) {
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Primero debes tomar o subir una foto.');
      }
      return;
    }
    
    const selectedWallpaper = availableWallpapers[wallpaperIndex];
    if (!selectedWallpaper) {
      console.error('Wallpaper not found at index:', wallpaperIndex);
      return;
    }
    
    try {
      setIsProcessing(true);
      setCurrentWallpaperIndex(wallpaperIndex);
      setSelectedImageIndex(0);
      console.log('Reprocessing with wallpaper:', selectedWallpaper.name);
      await processImageWithAI(uploadedImage, selectedWallpaper);
    } catch (error) {
      console.error('Error reprocessing:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'No se pudo reprocesar la imagen.');
      }
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function fetchImageAsBase64(imageUrl: string): Promise<string> {
    console.log('Starting fetchImageAsBase64 for URL:', imageUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Fetch timeout reached, aborting...');
      controller.abort();
    }, 45000);
    
    try {
      const cleanUrl = imageUrl.trim();
      
      const proxyServices = [
        cleanUrl,
        `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&default=1`,
        `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`,
      ];
      
      let lastError: Error | null = null;
      
      for (let i = 0; i < proxyServices.length; i++) {
        const url = proxyServices[i];
        const methodName = i === 0 ? 'Direct' : `Proxy ${i}`;
        console.log(`[${i + 1}/${proxyServices.length}] Trying ${methodName}...`);
        console.log(`URL: ${url.substring(0, 100)}...`);
        
        try {
          const fetchOptions: RequestInit = {
            signal: controller.signal,
            method: 'GET',
          };
          
          if (i === 0) {
            fetchOptions.headers = {
              'Accept': 'image/*,*/*',
              'Cache-Control': 'no-cache',
            };
          }
          
          console.log(`Fetching with options:`, { method: fetchOptions.method });
          const response = await fetch(url, fetchOptions);
          
          console.log(`Response status: ${response.status} ${response.statusText}`);
          console.log(`Response headers:`, {
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (contentType && !contentType.startsWith('image/')) {
            console.warn('Response is not an image:', contentType);
            throw new Error('Invalid content type');
          }
          
          const blob = await response.blob();
          console.log(`Blob received - size: ${blob.size}, type: ${blob.type}`);
          
          if (blob.size === 0) {
            throw new Error('Empty image response');
          }
          
          if (blob.size > 10 * 1024 * 1024) {
            console.warn('Large image detected:', blob.size, 'bytes');
          }
          
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            
            const readerTimeout = setTimeout(() => {
              reject(new Error('FileReader timeout'));
            }, 15000);
            
            reader.onloadend = () => {
              clearTimeout(readerTimeout);
              const result = reader.result as string;
              if (!result || typeof result !== 'string') {
                reject(new Error('Failed to convert to base64'));
                return;
              }
              
              const base64Data = result.split(',')[1];
              if (!base64Data) {
                reject(new Error('Invalid base64 format'));
                return;
              }
              
              console.log(`Base64 conversion successful, length: ${base64Data.length}`);
              resolve(base64Data);
            };
            
            reader.onerror = (error) => {
              clearTimeout(readerTimeout);
              console.error('FileReader error:', error);
              reject(new Error('FileReader error'));
            };
            
            reader.readAsDataURL(blob);
          });
          
          clearTimeout(timeoutId);
          console.log(`✓ Successfully fetched and converted image using ${methodName}`);
          return base64;
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`✗ Method ${i + 1} (${methodName}) failed:`, errorMsg);
          
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (error instanceof Error && error.name === 'AbortError') {
            console.error('Request aborted due to timeout');
            break;
          }
          
          if (i < proxyServices.length - 1) {
            console.log('Trying next method...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }
      }
      
      console.error('All fetch methods failed');
      const errorMessage = lastError?.message || 'Unknown error';
      throw new Error(`No se pudo cargar la imagen del papel tapiz. ${errorMessage.includes('Failed to fetch') ? 'Verifica tu conexión a internet o intenta con otra imagen.' : errorMessage}`);
      
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  async function compressBase64Image(base64: string, maxSize: number = 1024): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        console.log('Web platform - using canvas compression');
        return await compressBase64ImageWeb(base64, maxSize);
      }
      
      const imageUri = `data:image/jpeg;base64,${base64}`;
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: maxSize } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      if (!manipulated.base64) {
        console.log('No base64 in manipulated result, returning original');
        return base64;
      }
      
      console.log('Image compressed - original:', base64.length, 'compressed:', manipulated.base64.length);
      return manipulated.base64;
    } catch (error) {
      console.error('Error compressing image:', error instanceof Error ? error.message : 'Unknown error');
      return base64;
    }
  }
  
  function detectLowLight(imageBase64: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        try {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (!ctx) {
              resolve(false);
              return;
            }
            
            const sampleSize = 100;
            canvas.width = sampleSize;
            canvas.height = sampleSize;
            
            ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
            
            try {
              const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
              const data = imageData.data;
              
              let totalBrightness = 0;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                totalBrightness += brightness;
              }
              
              const avgBrightness = totalBrightness / (sampleSize * sampleSize);
              console.log('Average brightness:', avgBrightness);
              
              const isLowLight = avgBrightness < 80;
              resolve(isLowLight);
            } catch (error) {
              console.error('Error analyzing brightness:', error);
              resolve(false);
            }
          };
          
          img.onerror = () => resolve(false);
          img.crossOrigin = 'anonymous';
          const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          img.src = `data:image/jpeg;base64,${cleanBase64}`;
        } catch (error) {
          console.error('Error in detectLowLight:', error);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  }
  
  async function compressBase64ImageWeb(base64: string, maxSize: number = 1024): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const img = new window.Image();
        
        img.onload = () => {
          try {
            console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
            
            if (!img.width || !img.height || img.width === 0 || img.height === 0) {
              console.error('Invalid image dimensions');
              resolve(base64);
              return;
            }
            
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }
            
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            
            const ctx = canvas.getContext('2d', { willReadFrequently: false });
            if (!ctx) {
              console.error('Failed to get canvas context');
              resolve(base64);
              return;
            }
            
            ctx.drawImage(img, 0, 0, Math.round(width), Math.round(height));
            
            try {
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
              if (!compressedDataUrl || !compressedDataUrl.includes(',')) {
                console.error('Invalid dataURL generated');
                resolve(base64);
                return;
              }
              
              const compressedBase64 = compressedDataUrl.split(',')[1];
              if (!compressedBase64) {
                console.error('Failed to extract base64 from dataURL');
                resolve(base64);
                return;
              }
              
              console.log('Web compression - original:', base64.length, 'compressed:', compressedBase64.length);
              resolve(compressedBase64);
            } catch (toDataURLError) {
              console.error('toDataURL error:', toDataURLError instanceof Error ? toDataURLError.message : 'Unknown error');
              resolve(base64);
            }
          } catch (canvasError) {
            console.error('Canvas processing error:', canvasError instanceof Error ? canvasError.message : String(canvasError));
            resolve(base64);
          }
        };
        
        img.onerror = (error) => {
          console.error('Image load error:', error instanceof Event ? 'Load failed' : String(error));
          resolve(base64);
        };
        
        // Set crossOrigin before src to avoid CORS issues
        img.crossOrigin = 'anonymous';
        
        // Validate base64 before setting src
        if (!base64 || base64.length === 0) {
          console.error('Empty base64 string provided');
          resolve(base64);
          return;
        }
        
        // Remove any existing data URI prefix from base64
        const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
        
        img.src = `data:image/jpeg;base64,${cleanBase64}`;
      } catch (error) {
        console.error('Web compression setup error:', error instanceof Error ? error.message : String(error));
        resolve(base64);
      }
    });
  }

  async function processImageWithAI(imageBase64: string, selectedWallpaper: typeof wallpaper) {
    console.log('=== AI PROCESSING START ===');
    
    if (!selectedWallpaper) {
      console.error('No wallpaper selected for AI processing');
      throw new Error('No se seleccionó papel tapiz');
    }
    
    try {
      console.log('Preparing AI request...');
      
      // First, compress the captured/uploaded image
      console.log('Compressing user image...');
      const compressedUserImage = await compressBase64Image(imageBase64, 1280);
      
      const selectedImageUrl = selectedWallpaper.imageUrls && selectedWallpaper.imageUrls.length > 0 
        ? selectedWallpaper.imageUrls[selectedImageIndex] || selectedWallpaper.imageUrls[0]
        : selectedWallpaper.imageUrl;
      console.log('Selected wallpaper image URL:', selectedImageUrl);
      console.log('Selected image index:', selectedImageIndex);
      
      // Then, convert and compress the wallpaper image URL to base64
      let wallpaperBase64: string;
      try {
        console.log('Attempting to fetch wallpaper image...');
        
        wallpaperBase64 = await fetchImageAsBase64(selectedImageUrl);
        console.log('Wallpaper image converted to base64, length:', wallpaperBase64.length);
        
        // Compress wallpaper image too
        console.log('Compressing wallpaper image...');
        wallpaperBase64 = await compressBase64Image(wallpaperBase64, 1280);
        
      } catch (error) {
        console.error('Error converting wallpaper image to base64:', error);
        
        // Navigate to result screen without AI processing
        console.log('Falling back to result screen without AI processing...');
        const errorMessage = error instanceof Error && error.name === 'AbortError' 
          ? 'Tiempo de espera agotado al cargar la imagen. Mostrando imagen original.'
          : 'No se pudo cargar la imagen del papel tapiz. Mostrando imagen original.';
          
        const navigationParams = {
          originalImage: compressedUserImage,
          processedImage: '', // Empty processed image
          wallpaperId: selectedWallpaper.id,
          aiProcessingFailed: 'true',
          errorMessage
        };
        
        router.push({
          pathname: '/wallpaper-result',
          params: navigationParams
        });
        
        return; // Exit early, don't throw error
      }
      
      const prompt = `You are an expert at applying wallpaper patterns to walls in photos with advanced wall detection capabilities.

TASK: Apply the wallpaper pattern from the SECOND IMAGE onto the walls in the FIRST IMAGE.

CRITICAL WALL DETECTION RULES:

1. PRIMARY WALL IDENTIFICATION:
   - FIRST: Analyze the entire image to identify wall surfaces by color, texture, and flatness
   - PRIORITY: The largest continuous flat surface in the center of the image is the PRIMARY TARGET WALL
   - Look for wall indicators: flat surfaces, paint/texture, behind furniture, between floor and ceiling
   - Walls are typically vertical surfaces with uniform color/texture
   - Ignore furniture, decorative items, doors, windows - these are NOT walls
   - If there's a dominant colored wall (like green), that's likely the target wall
   - The primary wall should occupy the largest area in the center/background of the image

2. DISTINGUISH WALLS FROM NON-WALLS:
   - Walls: Flat vertical surfaces, uniform texture, background elements
   - NOT walls: Furniture (shelves, cabinets, wardrobes), decorative items, people, clocks, frames
   - Furniture has depth, edges, and is in the foreground
   - Walls are in the background, behind objects
   - Focus ONLY on painting/coloring the background wall surface

3. PATTERN EXTRACTION (from SECOND image):
   - Extract the core wallpaper design/pattern
   - Ignore any room context, furniture, people, or objects in the product image
   - Focus ONLY on the wallpaper texture and pattern itself

4. APPLICATION STRATEGY:
   - Apply wallpaper ONLY to the identified PRIMARY WALL (the largest, most central wall surface)
   - DO NOT apply wallpaper to furniture, objects, or non-wall surfaces
   - Start from the center of the main wall and extend to its edges
   - If multiple walls are visible (like corner walls), apply to the MAIN WALL FIRST with highest priority
   - Match the wall's perspective, lighting, and depth
   - Keep all furniture, objects, people, and decorative items exactly as they are - DO NOT apply pattern to them

5. REALISM & QUALITY:
   - Respect perspective and vanishing points of the wall surface
   - Match the lighting direction and intensity of the wall
   - Maintain natural shadows and reflections on the wall
   - Ensure seamless pattern tiling on the wall
   - The wallpaper should look like it's painted/applied on the wall surface only

FINAL CHECK:
- Is the wallpaper applied ONLY to the main wall surface?
- Did I avoid applying wallpaper to furniture, shelves, or decorative items?
- Does the main wall in the center/background have the wallpaper?
- Are all objects and furniture preserved without wallpaper on them?

PRIORITY: Identify the PRIMARY WALL correctly (largest flat vertical surface in background/center), and apply wallpaper ONLY to that wall surface with highest quality and accuracy.`;
      
      const cleanImageBase64 = compressedUserImage.replace(/^data:image\/[a-z]+;base64,/, '');
      const cleanWallpaperBase64 = wallpaperBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      console.log('Final image sizes - User:', cleanImageBase64.length, 'Wallpaper:', cleanWallpaperBase64.length);
      
      const requestBody = {
        prompt: prompt,
        images: [
          {
            type: 'image' as const,
            image: cleanImageBase64
          },
          {
            type: 'image' as const,
            image: cleanWallpaperBase64
          }
        ]
      };
      
      console.log('Making API request to image editing service...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      let response;
      try {
        response = await fetch('https://toolkit.rork.com/images/edit/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log('API Response status:', response.status);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', errorData);
        
        let errorMessage = 'El servicio de IA no está disponible temporalmente. Mostrando imagen original.';
        if (response.status === 429) {
          errorMessage = 'Servicio de IA ocupado. Por favor intenta nuevamente en unos momentos.';
        } else if (response.status >= 500) {
          errorMessage = 'Error del servidor de IA (código 500). La imagen podría ser muy compleja. Mostrando imagen original.';
        } else if (response.status === 400) {
          errorMessage = 'No se pudo procesar la imagen. Intenta con otra foto más clara. Mostrando imagen original.';
        }
        
        // Navigate to result screen without AI processing
        const navigationParams = {
          originalImage: compressedUserImage,
          processedImage: '', // Empty processed image
          wallpaperId: selectedWallpaper.id,
          aiProcessingFailed: 'true',
          errorMessage
        };
        
        router.push({
          pathname: '/wallpaper-result',
          params: navigationParams
        });
        
        return; // Exit early, don't throw error
      }
      
      const result = await response.json();
      console.log('AI processing successful, response:', { hasImage: !!result.image, hasBase64: !!result.image?.base64Data });
      
      if (!result.image || !result.image.base64Data) {
        console.error('Invalid AI response format:', result);
        
        // Navigate to result screen without AI processing
        const navigationParams = {
          originalImage: compressedUserImage,
          processedImage: '', // Empty processed image
          wallpaperId: selectedWallpaper.id,
          aiProcessingFailed: 'true',
          errorMessage: 'La IA no pudo generar la imagen. Mostrando imagen original.'
        };
        
        router.push({
          pathname: '/wallpaper-result',
          params: navigationParams
        });
        
        return; // Exit early, don't throw error
      }
      
      // Navigate to result screen with processed image
      const navigationParams = {
        originalImage: compressedUserImage,
        processedImage: result.image.base64Data,
        wallpaperId: selectedWallpaper.id,
        aiProcessingFailed: 'false'
      };
      
      console.log('Navigating to result screen with processed image...');
      router.push({
        pathname: '/wallpaper-result',
        params: navigationParams
      });
      
    } catch (error) {
      console.error('=== AI PROCESSING ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Determine error message based on error type
      let errorMessage = 'Error inesperado. Mostrando imagen original.';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Tiempo de espera agotado. Mostrando imagen original.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        }
      }
      
      // Determine error message based on error type
      const compressedImageToUse = imageBase64;
      try {
        const compressed = await compressBase64Image(imageBase64, 1024);
        // Navigate to result screen without AI processing as fallback
        const navigationParams = {
          originalImage: compressed,
          processedImage: '', // Empty processed image
          wallpaperId: selectedWallpaper?.id || '',
          aiProcessingFailed: 'true',
          errorMessage
        };
        
        console.log('Navigating to result screen with error fallback...');
        router.push({
          pathname: '/wallpaper-result',
          params: navigationParams
        });
        return;
      } catch (compressError) {
        console.error('Error compressing fallback image:', compressError);
      }
      
      const navigationParams = {
        originalImage: compressedImageToUse,
        processedImage: '', // Empty processed image
        wallpaperId: selectedWallpaper?.id || '',
        aiProcessingFailed: 'true',
        errorMessage
      };
      
      console.log('Navigating to result screen with error fallback...');
      router.push({
        pathname: '/wallpaper-result',
        params: navigationParams
      });
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Visualizar Papel Tapiz</Text>
          <Text style={styles.headerSubtitle}>
            {currentWallpaper ? `Aplicando: ${currentWallpaper.name}` : 'Toma o sube una foto de tu pared'}
          </Text>
          {project && (
            <Text style={styles.projectText}>
              Proyecto: {project.name}
            </Text>
          )}
          {cartWallpapers.length > 0 && !project && (
            <Text style={styles.cartInfoText}>
              {cartWallpapers.length} papel{cartWallpapers.length !== 1 ? 'es' : ''} tapiz en carrito
            </Text>
          )}
          {availableImages.length > 1 && (
            <Text style={styles.imageSelectionText}>
              Imagen {selectedImageIndex + 1} de {availableImages.length}
            </Text>
          )}
        </View>
      </View>
      
      {availableWallpapers.length > 1 && !isProcessing && (
        <View style={styles.wallpaperSelectionContainer}>
          <View style={styles.wallpaperSelectionHeader}>
            <Text style={styles.wallpaperSelectionTitle}>
              {uploadedImage ? 'Cambiar papel tapiz:' : 'Papeles tapiz disponibles:'}
            </Text>
            {uploadedImage && (
              <View style={styles.uploadedBadge}>
                <Text style={styles.uploadedBadgeText}>Foto lista</Text>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wallpaperOptions}>
            {availableWallpapers.map((wp, index) => (
              <TouchableOpacity
                key={wp.id}
                style={[
                  styles.wallpaperOption,
                  currentWallpaperIndex === index && styles.wallpaperOptionSelected
                ]}
                onPress={() => {
                  if (uploadedImage) {
                    reprocessWithDifferentWallpaper(index);
                  } else {
                    setCurrentWallpaperIndex(index);
                    setSelectedImageIndex(0);
                  }
                }}
              >
                <Image source={{ uri: wp.imageUrl }} style={styles.wallpaperOptionImage} />
                <Text style={styles.wallpaperOptionName} numberOfLines={1}>{wp.name}</Text>
                {currentWallpaperIndex === index && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIndicatorText}>✓</Text>
                  </View>
                )}
                {uploadedImage && (
                  <View style={styles.reprocessIcon}>
                    <Repeat size={14} color={Colors.light.background} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {availableImages.length > 1 && !isProcessing && (
        <View style={styles.imageSelectionContainer}>
          <Text style={styles.imageSelectionTitle}>Imágenes del papel tapiz:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageOptions}>
            {availableImages.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.imageOption,
                  selectedImageIndex === index && styles.imageOptionSelected
                ]}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image source={{ uri: imageUrl }} style={styles.optionImage} />
                {selectedImageIndex === index && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIndicatorText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {showLowLightWarning && !isProcessing && (
        <View style={styles.lightWarningContainer}>
          <Text style={styles.lightWarningText}>
            💡 Para obtener un resultado más exacto, mejora la iluminación
          </Text>
        </View>
      )}
      
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.processingText}>
            Procesando con IA...
          </Text>
          <Text style={styles.processingSubtext}>
            Aplicando papel tapiz a tu pared
          </Text>
        </View>
      )}
      
      <View style={styles.cameraContainer}>
        {uploadedImage ? (
          <View style={styles.camera}>
            <Image 
              source={{ uri: `data:image/jpeg;base64,${uploadedImage}` }} 
              style={styles.uploadedImagePreview}
              resizeMode="contain"
            />
            <View style={styles.uploadedOverlay}>
              <View style={styles.uploadedInfo}>
                <Text style={styles.uploadedInfoText}>Foto lista para procesar</Text>
                <Text style={styles.uploadedInfoSubtext}>
                  {availableWallpapers.length > 1 
                    ? 'Selecciona diferentes papeles tapiz arriba para ver cambios'
                    : 'Toca capturar para procesar'}
                </Text>
              </View>
            </View>
            
            <View style={styles.controls}>
              <TouchableOpacity 
                style={[styles.changePhotoButton, isProcessing && styles.disabledButton]} 
                onPress={() => setUploadedImage(null)}
                disabled={isProcessing}
              >
                <Camera size={24} color={Colors.light.background} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.captureButton, isProcessing && styles.disabledButton]} 
                onPress={() => {
                  if (currentWallpaper && uploadedImage) {
                    setIsProcessing(true);
                    processImageWithAI(uploadedImage, currentWallpaper).finally(() => setIsProcessing(false));
                  }
                }}
                disabled={isProcessing}
              >
                <View style={styles.captureButtonInner}>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={Colors.light.background} />
                  ) : (
                    <Circle size={32} color={Colors.light.background} />
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.galleryButton, isProcessing && styles.disabledButton]} 
                onPress={pickImage}
                disabled={isProcessing}
              >
                <ImageIcon size={24} color={Colors.light.background} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <CameraView 
            ref={cameraRef} 
            style={styles.camera} 
            facing={facing}
            zoom={0}
            enableTorch={false}
            videoQuality="1080p"
            responsiveOrientationWhenOrientationLocked={true}
            onCameraReady={() => {
              console.log('Camera ready callback triggered');
              setIsCameraReady(true);
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.guideline} />
              <Text style={styles.guideText}>
                Apunta hacia la pared donde quieres colocar el papel tapiz
              </Text>
            </View>
            
            <View style={styles.controls}>
              <TouchableOpacity 
                style={[styles.flipButton, isProcessing && styles.disabledButton]} 
                onPress={toggleCameraFacing}
                disabled={isProcessing}
              >
                <FlipHorizontal size={24} color={Colors.light.background} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.captureButton, (isProcessing || !isCameraReady) && styles.disabledButton]} 
                onPress={takePicture}
                disabled={isProcessing || !isCameraReady}
              >
                <View style={styles.captureButtonInner}>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={Colors.light.background} />
                  ) : (
                    <Circle size={32} color={Colors.light.background} />
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.galleryButton, isProcessing && styles.disabledButton]} 
                onPress={pickImage}
                disabled={isProcessing}
              >
                <ImageIcon size={24} color={Colors.light.background} />
              </TouchableOpacity>
            </View>
          </CameraView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  guideline: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  guideText: {
    color: Colors.light.background,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.light.background,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    backgroundColor: Colors.light.primary,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  processingSubtext: {
    color: Colors.light.background,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  imageSelectionText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  projectText: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  wallpaperSelectionContainer: {
    backgroundColor: Colors.light.primary,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  wallpaperSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.background,
    marginBottom: 12,
  },
  wallpaperOptions: {
    flexDirection: 'row',
  },
  wallpaperOption: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Colors.light.background,
    padding: 4,
    width: 80,
  },
  wallpaperOptionSelected: {
    borderColor: Colors.light.background,
    borderWidth: 3,
  },
  wallpaperOptionImage: {
    width: 72,
    height: 72,
    resizeMode: 'cover',
    borderRadius: 4,
  },
  wallpaperOptionName: {
    fontSize: 10,
    color: Colors.light.text,
    marginTop: 4,
    textAlign: 'center',
  },
  imageSelectionContainer: {
    backgroundColor: Colors.light.backgroundSecondary,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  imageSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  imageOptions: {
    flexDirection: 'row',
  },
  imageOption: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageOptionSelected: {
    borderColor: Colors.light.primary,
  },
  optionImage: {
    width: 60,
    height: 60,
    resizeMode: 'cover',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartInfoText: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  wallpaperSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadedBadge: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  uploadedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  reprocessIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedImagePreview: {
    flex: 1,
    width: '100%',
  },
  uploadedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  uploadedInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadedInfoText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  uploadedInfoSubtext: {
    color: Colors.light.background,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  lightWarningContainer: {
    backgroundColor: '#FFA500',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  lightWarningText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});