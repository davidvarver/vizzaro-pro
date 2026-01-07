import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    Platform,
    Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapersStore } from '@/store/useWallpapersStore';


const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CameraScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
    }, [permission]);

    const params = useLocalSearchParams<{ wallpaperId?: string }>();
    const { wallpaperId } = params;
    const { getWallpaperById, addUserRoom, userRooms, setVisualizerImage, updateUserRoomMask } = useWallpapersStore();

    // ... (helper functions fetchImageAsBase64, compressBase64Image, processImageWithAI are unchanged)

    // BUT I must re-declare processCapturedImage because I am replacing it.
    // I need to be careful to KEEP the helpers if I am only replacing the function.
    // However, I need `setVisualizerImage` in scope.
    // It is destructured at the top. I need to update the destructuring line first.

    const wallpaper = wallpaperId ? getWallpaperById(wallpaperId) : null;

    // Helper functions from user snippet
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
                try {
                    const response = await fetch(url, {
                        signal: controller.signal,
                        method: 'GET',
                        headers: i === 0 ? { 'Accept': 'image/*,*/*', 'Cache-Control': 'no-cache' } : undefined
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const blob = await response.blob();

                    return await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const result = reader.result as string;
                            resolve(result.split(',')[1] || '');
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.warn(`Fetch method ${i} failed`, e);
                    lastError = e instanceof Error ? e : new Error(String(e));
                }
            }
            throw lastError || new Error('Failed to fetch image');
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async function compressBase64Image(base64: string, maxSize: number = 1024): Promise<string> {
        try {
            if (Platform.OS === 'web') return base64; // Web compression omitted for brevity unless requested
            const imageUri = `data:image/jpeg;base64,${base64}`;
            const manipulated = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: maxSize } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            return manipulated.base64 || base64;
        } catch (error) {
            console.error('Error compressing:', error);
            return base64;
        }
    }

    async function processImageWithAI(imageBase64: string, selectedWallpaper: any) {
        console.log('=== AI PROCESSING START ===');
        try {
            setProcessingStep('Preparando imágenes...');
            // 1. Compress user image
            const compressedUserImage = await compressBase64Image(imageBase64, 1280);

            // 2. Prepare wallpaper image
            // Note: adapting to store structure vs user snippet structure
            const selectedImageUrl = selectedWallpaper.imageUrl;

            setProcessingStep('Obteniendo papel tapiz...');
            let wallpaperBase64 = await fetchImageAsBase64(selectedImageUrl);
            wallpaperBase64 = await compressBase64Image(wallpaperBase64, 1280);

            // 3. Prepare Request
            const prompt = `You are a strict architectural visualization AI.
TASK: Replace the texture of the MAIN CENTER WALL in the first image with the wallpaper pattern from the second image.
WALL SELECTION RULES (CRITICAL):
1. SELECT ONLY THE CENTER WALL: The target is the wall directly FACING the camera.
2. IGNORE SIDE WALLS: Do NOT apply wallpaper to walls on the left or right edges (perspective walls).
3. IGNORE CEILING/FLOOR/OFF-CENTER WALLS.

PRESERVATION RULES (ZERO TOLERANCE):
1. PIXEL-PERFECT PRESERVATION: Every pixel that is NOT the centered wall must remain EXACTLY the same.
2. NO NEW OBJECTS: Do NOT generate furniture, plants, or decorations.
3. NO REMOVALS: Do NOT remove existing furniture or objects.
4. LIGHTING: Keep the original lighting and shadows exactly as they are.

OUTPUT GOAL: A photo-realistic composite where only the center wall texture is changed, and everything else is 100% original.`;

            const cleanImageBase64 = compressedUserImage.replace(/^data:image\/[a-z]+;base64,/, '');
            const cleanWallpaperBase64 = wallpaperBase64.replace(/^data:image\/[a-z]+;base64,/, '');

            const requestBody = {
                prompt: prompt,
                images: [
                    { type: 'image', image: cleanImageBase64 },
                    { type: 'image', image: cleanWallpaperBase64 }
                ]
            };

            setProcessingStep('Procesando con IA...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

            const response = await fetch('https://toolkit.rork.com/images/edit/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`AI API Failed: ${response.status} - ${errText}`);
            }

            const result = await response.json();
            if (!result.image?.base64Data) {
                throw new Error('Invalid AI response format');
            }

            return {
                original: compressedUserImage,
                processed: result.image.base64Data,
                failed: false
            };

        } catch (error) {
            console.error('AI Processing Error:', error);
            const compressed = await compressBase64Image(imageBase64, 1024);
            return {
                original: compressed,
                processed: '',
                failed: true,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    const compressImage = async (uri: string) => {
        try {
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1080 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            return result;
        } catch (error) {
            console.error('Error compressing image:', error);
            throw error;
        }
    };

    const processCapturedImage = async (uri: string) => {
        try {
            setIsProcessing(true);
            setProcessingStep('Comprimiendo...');

            // Initial compression just to get base64
            const compressed = await compressImage(uri);
            const base64Image = compressed.base64 || '';

            // Save to room gallery (History)
            await addUserRoom(base64Image);
            // Get the ID of the new room (first in list)
            const currentRooms = useWallpapersStore.getState().userRooms;
            const newRoomId = currentRooms[0]?.id;

            // NEW: Enable Smart Mask (Generic) immediately
            // This ensures logic "If hasMask, ALWAYS use overlay" works in Result screen.
            // This provides "Instant Preview" capability.
            if (newRoomId) {
                await updateUserRoomMask(newRoomId, "MOCK_GRADIENT_MASK_ID");
            }

            if (wallpaper) {
                // If we have a wallpaper, use the full AI flow
                const result = await processImageWithAI(base64Image, wallpaper);

                if (!result.failed && result.processed) {
                    setVisualizerImage(result.processed);
                } else {
                    setVisualizerImage(null);
                }

                router.push({
                    pathname: '/wallpaper-result',
                    params: {
                        roomId: newRoomId,
                        // We do NOT pass the huge images here anymore
                        wallpaperId: wallpaper.id,
                        aiProcessingFailed: result.failed ? 'true' : 'false',
                        errorMessage: result.error
                    }
                });
            } else {
                // Fallback to old room-saving logic if no wallpaper selected
                setVisualizerImage(null);
                router.push({
                    pathname: '/wallpaper-result',
                    params: {
                        roomId: newRoomId,
                        aiProcessingFailed: 'false'
                    }
                });
            }

        } catch (error) {
            console.error('Processing error:', error);
            Alert.alert('Error', 'No se pudo procesar.');
        } finally {
            setIsProcessing(false);
        }
    };

    const takePicture = async () => {
        if (!cameraRef.current) return;
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false, // We compress later
                skipProcessing: true,
            });
            if (photo) {
                await processCapturedImage(photo.uri);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'No se pudo tomar la foto.');
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // Let them upload full room
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await processCapturedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Picker error:', error);
            Alert.alert('Error', 'Error al seleccionar imagen.');
        }
    };

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 50 }}>Permiso de cámara necesario</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.text}>Otorgar Permiso</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFill}
                ref={cameraRef}
            />
            <SafeAreaView style={styles.uiContainer} pointerEvents="box-none">
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Escanear Habitación</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={pickImage} style={styles.galleryButton}>
                        <Ionicons name="images" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
                        <View style={styles.captureInner} />
                    </TouchableOpacity>

                    <View style={{ width: 44 }} />
                </View>
            </SafeAreaView>

            {isProcessing && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.light.tint} />
                    <Text style={styles.loadingText}>{processingStep}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    uiContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    iconButton: {
        padding: 8,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingTop: 20,
    },
    galleryButton: {
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 50,
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: 'black',
        backgroundColor: 'white',
    },
    button: {
        marginTop: 20,
        padding: 10,
        backgroundColor: Colors.light.tint,
        borderRadius: 5,
        alignSelf: 'center',
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
    },
});
