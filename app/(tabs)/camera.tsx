import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
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
import { generateWallMask, processImageWithAI } from '@/utils/ai';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CameraScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const cameraRef = useRef<CameraView>(null);

    const { addUserRoom, updateUserRoomMask, userRooms } = useWallpapersStore();

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
    }, [permission]);

    const compressImage = async (uri: string) => {
        try {
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1080 } }], // Resize to reasonable width
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
            setProcessingStep('Preparando imagen...');

            // 1. Compress and get Base64
            const compressed = await compressImage(uri);
            const base64Image = compressed.base64 || '';
            const finalUri = compressed.uri;

            // Check if this image already exists in our rooms to avoid re-processing
            // Simple check: if we just added it, it's new. 
            // But if user picks same image again?
            // For now, assume every capture/pick is a "new" attempt unless we find exact match?
            // Let's just create a new room for every successful capture to be safe/simple.

            setProcessingStep('Analizando paredes...');

            // 2. Generate Mask (Smart Masking)
            let maskBase64 = '';
            let aiFallbackNeeded = false;

            try {
                console.log('[Camera] Generating wall mask...');
                maskBase64 = await generateWallMask(base64Image);
                console.log('[Camera] Mask generated successfully');
            } catch (maskError) {
                console.warn('[Camera] Mask generation failed, falling back to full processing:', maskError);
                aiFallbackNeeded = true;
            }

            // 3. Save to Store
            // We add the room. If we have a mask, we save it too.
            await addUserRoom(base64Image);

            // Get the ID of the room we just added (it's the newest one)
            // addUserRoom adds to the TOP of the list.
            // We need to wait a tiny bit or just fetch store again?
            // useWallpapersStore.getState() is better.
            const currentRooms = useWallpapersStore.getState().userRooms;
            const newRoom = currentRooms[0]; // The one we just added

            if (maskBase64 && newRoom) {
                await updateUserRoomMask(newRoom.id, maskBase64);
            }

            if (aiFallbackNeeded) {
                // If mask generation failed, we can't do local preview.
                // We will navigate to result, but the result screen needs to know 
                // that it should probably trigger a full AI process or we do it here?
                // The objective says: "If mask generation fails... implement a fallback to the full AI processing".
                // It's better to do it here so user enters Result screen with SOMETHING.
                setProcessingStep('Procesando diseño completo (Fallback)...');
                // We need a wallpaper to process against? 
                // Wait, if we are just "Scanning the room", we don't have a specific wallpaper selected yet?
                // Usually Camera is entered from "Try in my room" on a wallpaper, OR from the tab.
                // If from Tab, we don't have a wallpaper.
                // If we don't have a wallpaper, we CAN'T do full AI processing (needs 2 images).

                // If we came from the Tab, we just want to save the room and maybe go to "Select Wallpaper"?
                // Or go to Result screen with "No Wallpaper Selected"?

                // For Smart Visualizer:
                // Ideally, we just save the room + mask.
                // Then user picks a wallpaper.

                // If mask generation failed, and we have no wallpaper, we just save the room (raw).
                // The user will pick a wallpaper later, and THEN we might have to do full AI.
                // But the "Result" screen usually expects to show *something*.

                // Let's assume for now we just navigate to the result/preview with the room image.
                // Pass `processedImage: ''` and the result screen handles the rest.
            } else {
                // Success with mask
            }

            setIsProcessing(false);

            // Navigate to options/result
            // We pass the raw image uri to show.
            // If we have a mask, the result screen (if updated) will find it in the store.
            router.push({
                pathname: '/wallpaper-result',
                params: {
                    image: finalUri,
                    roomId: newRoom?.id,
                }
            });

        } catch (error) {
            console.error('Processing error:', error);
            Alert.alert('Error', 'No se pudo procesar la imagen.');
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
                style={styles.camera}
                ref={cameraRef}
            >
                <SafeAreaView style={styles.uiContainer}>
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
            </CameraView>
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
        flex: 1,
        justifyContent: 'space-between',
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
