import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
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
import { processImageWithAI, fetchImageAsBase64, generateWallMask } from '@/utils/ai';


const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CameraScreen() {
    const isFocused = useIsFocused();
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const [facing, setFacing] = useState<'back' | 'front'>('back');
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



    // REMOVED local fetchImageAsBase64 and processImageWithAI to use @/utils/ai instead
    // We kept compressBase64Image as it uses ImageManipulator specific to this component or can be moved too.
    // For minimal refactor risk, I won't move compressBase64Image yet unless needed.

    async function processVisualizerFlow(imageBase64: string, selectedWallpaper: any) {
        console.log('=== AI PROCESSING START ===');
        try {
            setProcessingStep('Preparing images...');
            // 1. Compress user image
            const compressedUserImage = await compressBase64Image(imageBase64, 1280);

            // 2. Prepare wallpaper image
            const selectedImageUrl = selectedWallpaper.imageUrl;
            setProcessingStep('Fetching wallpaper...');
            let wallpaperBase64 = await fetchImageAsBase64(selectedImageUrl);
            wallpaperBase64 = await compressBase64Image(wallpaperBase64, 1280);

            // 3. Process
            setProcessingStep('Processing with AI...');
            const resultBase64 = await processImageWithAI(compressedUserImage, wallpaperBase64);

            return {
                original: compressedUserImage,
                processed: resultBase64,
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
            setProcessingStep('Compressing...');

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
            // NEW: Fire-and-forget generation of the Smart Mask
            // We set a temporary mock mask so the user can enter the screen immediately.
            // The AI will generate the real mask in background (~10-15s) and update the store.
            if (newRoomId) {
                // Set initial placeholder
                await updateUserRoomMask(newRoomId, "MOCK_GRADIENT_MASK_ID");

                // Trigger background generation (NO AWAIT)
                // Use the same base64Image (1080p) to ensure mask aligns with the room.
                console.log('[Camera] Triggering background Mask Generation...');

                generateWallMask(base64Image)
                    .then(async (realMaskBase64) => {
                        console.log('[Camera] Smart Mask Generated! Updating store...');
                        await updateUserRoomMask(newRoomId, realMaskBase64);
                    })
                    .catch(err => {
                        console.error('[Camera] Background Mask Generation Failed:', err);
                        // We keep the mock mask as fallback
                    });
            }

            if (wallpaper) {
                // If we have a wallpaper, use the full AI flow
                const result = await processVisualizerFlow(base64Image, wallpaper);

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
            Alert.alert('Error', 'Could not process.');
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
            Alert.alert('Error', 'Could not take photo.');
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
            Alert.alert('Error', 'Error selecting image.');
        }
    };

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 50 }}>Camera permission required</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.text}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {isFocused && ( // Only render camera if screen is focused
                <CameraView
                    style={StyleSheet.absoluteFill}
                    facing={facing}
                    ref={cameraRef}
                />
            )}
            <SafeAreaView style={styles.uiContainer} pointerEvents="box-none">
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Scan Room</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity onPress={pickImage} style={styles.galleryButton}>
                        <Ionicons name="images" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
                        <View style={styles.captureInner} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} style={styles.galleryButton}>
                        <Ionicons name="camera-reverse" size={24} color="white" />
                    </TouchableOpacity>
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
