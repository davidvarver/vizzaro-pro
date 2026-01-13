import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Alert,
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
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');

    const params = useLocalSearchParams<{ wallpaperId?: string }>();
    const { wallpaperId } = params;
    const { getWallpaperById, addUserRoom, setVisualizerImage, updateUserRoomMask } = useWallpapersStore();

    const wallpaper = wallpaperId ? getWallpaperById(wallpaperId) : null;

    async function compressBase64Image(base64: string, maxSize: number = 1024): Promise<string> {
        try {
            if (Platform.OS === 'web') return base64;
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

            if (newRoomId) {
                // Set initial placeholder
                await updateUserRoomMask(newRoomId, "MOCK_GRADIENT_MASK_ID");

                // Trigger background generation (NO AWAIT)
                console.log('[Camera] Triggering background Mask Generation...');

                generateWallMask(base64Image)
                    .then(async (realMaskBase64) => {
                        console.log('[Camera] Smart Mask Generated! Updating store...');
                        await updateUserRoomMask(newRoomId, realMaskBase64);
                    })
                    .catch(err => {
                        console.error('[Camera] Background Mask Generation Failed:', err);
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

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.uiContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Visualizer</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="image-outline" size={80} color={Colors.light.tint} />
                    </View>
                    <Text style={styles.title}>Upload a Photo</Text>
                    <Text style={styles.subtitle}>
                        Choose a photo of your room to see how the wallpaper looks in your space.
                    </Text>

                    <TouchableOpacity onPress={pickImage} style={styles.uploadButton}>
                        <Ionicons name="images" size={24} color="white" style={{ marginRight: 10 }} />
                        <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
                    </TouchableOpacity>

                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsTitle}>💡 For best results:</Text>
                        <Text style={styles.tipText}>• Ensure the room is well lit</Text>
                        <Text style={styles.tipText}>• Stand directly in front of the main wall</Text>
                        <Text style={styles.tipText}>• Avoid blurry or dark photos</Text>
                    </View>
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
        backgroundColor: 'white',
    },
    uiContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'black',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingBottom: 100, // Move visually up a bit
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    uploadButton: {
        flexDirection: 'row',
        backgroundColor: Colors.light.tint,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    uploadButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    loadingText: {
        color: Colors.light.tint,
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
    },
    tipsContainer: {
        marginTop: 40,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        width: '100%',
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    tipText: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 4,
    },
});
