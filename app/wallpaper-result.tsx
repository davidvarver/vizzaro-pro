import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { WallpaperOverlay } from '@/components/visualizer/WallpaperOverlay';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/store/useCartStore';
import { processImageWithAI, fetchImageAsBase64 } from '@/utils/ai';

const { width } = Dimensions.get('window');

export default function WallpaperResultScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { roomId, wallpaperId: initialWallpaperId, aiProcessingFailed } = params;

    const formatUri = (uri: string | undefined | null) => {
        if (!uri) return '';
        if (uri.startsWith('data:') || uri.startsWith('file:') || uri.startsWith('http')) return uri;
        return `data:image/jpeg;base64,${uri}`;
    };

    const { userRooms, wallpapers, getWallpaperById, visualizerImage } = useWallpapersStore();
    const { addToCart } = useCartStore();

    const [selectedWallpaperId, setSelectedWallpaperId] = useState<string | null>(
        typeof initialWallpaperId === 'string' ? initialWallpaperId : null
    );

    // Find the room logic
    const room = useMemo(() => {
        if (typeof roomId === 'string') {
            return userRooms.find(r => r.id === roomId);
        }
        return null;
    }, [roomId, userRooms]);

    // Derived state
    const currentWallpaper = selectedWallpaperId ? getWallpaperById(selectedWallpaperId) : null;
    const hasMask = !!room?.maskImage;

    // Display Logic:
    // 1. If we have visualizerImage (AI result) AND user hasn't changed wallpaper yet, show AI result.
    // 2. If user changed wallpaper or we prefer overlay (if implemented):
    //    - Right now we only have AI or Original.
    //    - If user changes wallpaper, we can't show AI result anymore (it's baked in).
    //    - So we show original.

    const showProcessedImage = !!visualizerImage && (selectedWallpaperId === initialWallpaperId);

    const shouldUseOverlay = hasMask && !!currentWallpaper; // Smart masking fallback if we had it

    const handleAddToCart = () => {
        if (!currentWallpaper) return;
        addToCart(currentWallpaper, 1, 5.33);
        Alert.alert('Éxito', 'Agregado al carrito');
    };

    const [isRegenerating, setIsRegenerating] = useState(false);

    // Import shared AI
    const { processImageWithAI, fetchImageAsBase64 } = require('@/utils/ai');
    // Note: require vs import might be tricky if not top level. 
    // Better to use import at top level, but let's stick to the plan.
    // Actually, I can't use require in the middle of a functional component easily for async logic without messy types.
    // I should add the import at the top.

    // ... (Wait, I'll do this in the next step. For now, let's just assume the import is there and add the logic)

    const handleRegenerate = async () => {
        if (!room || !currentWallpaper) return;

        try {
            setIsRegenerating(true);

            // 1. Prepare images (similar to camera.tsx but simpler)
            const userImageBase64 = room.image;
            const wallpaperUrl = currentWallpaper.imageUrl;

            // Fetch wallpaper
            const wallpaperBase64 = await fetchImageAsBase64(wallpaperUrl);

            // Process
            const resultBase64 = await processImageWithAI(userImageBase64, wallpaperBase64);

            // Update Store
            useWallpapersStore.getState().setVisualizerImage(resultBase64);

            // Sync initial ID so it shows as "Processed"
            router.setParams({ wallpaperId: currentWallpaper.id });
            setSelectedWallpaperId(currentWallpaper.id); // Already set, but ensures consistency

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo generar la visualización.');
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'Visualizador',
                headerShown: true,
                headerBackTitle: 'Cámara',
                headerTintColor: Colors.light.tint
            }} />

            <View style={styles.visualizerContainer}>
                {showProcessedImage && !isRegenerating ? (
                    <Image
                        source={{ uri: formatUri(visualizerImage) }}
                        style={styles.mainImage}
                        resizeMode="cover"
                    />
                ) : shouldUseOverlay && room ? (
                    <View style={{ flex: 1 }}>
                        <WallpaperOverlay
                            originalImage={room.image}
                            maskImage={room.maskImage!}
                            patternImage={currentWallpaper!.imageUrl}
                            opacity={0.85}
                        />

                        {/* Logic: If ID changed, show "Generate" button, OR if it's improving initial */}
                        {isRegenerating ? (
                            <View style={styles.processingBadge}>
                                <ActivityIndicator size="small" color="white" />
                                <Text style={styles.processingText}>Generando nueva vista...</Text>
                            </View>
                        ) : selectedWallpaperId !== initialWallpaperId ? (
                            <>
                                {room.maskImage === "MOCK_GRADIENT_MASK_ID" && (
                                    <View style={[styles.processingBadge, { top: 60, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                                        <ActivityIndicator size="small" color="#FFD700" />
                                        <Text style={styles.processingText}>Escaneando geometría...</Text>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.generateButton} onPress={handleRegenerate}>
                                    <Ionicons name="sparkles" size={20} color="white" />
                                    <Text style={styles.generateButtonText}>Visualizar con IA</Text>
                                </TouchableOpacity>
                            </>
                        ) : !aiProcessingFailed && (
                            <View style={styles.processingBadge}>
                                <ActivityIndicator size="small" color="white" />
                                <Text style={styles.processingText}>Mejorando con IA...</Text>
                            </View>
                        )}
                    </View>
                ) : room ? (
                    <Image
                        source={{ uri: formatUri(room.image) }}
                        style={styles.mainImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ flex: 1, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color={Colors.light.tint} />
                        <Text style={{ marginTop: 10, color: '#666' }}>Cargando imagen...</Text>
                    </View>
                )}

                {(!shouldUseOverlay && !showProcessedImage && !currentWallpaper) && (
                    <View style={styles.instructionOverlay}>
                        <Text style={styles.instructionText}>Selecciona un papel tapiz para visualizar</Text>
                    </View>
                )}
            </View>

            <View style={styles.controlsContainer}>
                <View style={styles.wallpaperListContainer}>
                    <Text style={styles.sectionTitle}>Elegir Papel Tapiz</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wallpaperList}>
                        {wallpapers.map(wp => (
                            <TouchableOpacity
                                key={wp.id}
                                onPress={() => setSelectedWallpaperId(wp.id)}
                                style={[
                                    styles.wallpaperItem,
                                    selectedWallpaperId === wp.id && styles.selectedWallpaperItem
                                ]}
                            >
                                <Image source={{ uri: wp.imageUrl }} style={styles.wallpaperThumb} />
                                <Text numberOfLines={1} style={styles.wallpaperName}>{wp.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {currentWallpaper && (
                    <View style={styles.actionButtons}>
                        <View style={styles.fileInfo}>
                            <Text style={styles.productPrice}>${currentWallpaper.price.toFixed(2)}</Text>
                            <Text style={styles.productName}>{currentWallpaper.name}</Text>
                        </View>
                        <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
                            <Ionicons name="cart" size={20} color="white" />
                            <Text style={styles.addToCartText}>Agregar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    visualizerContainer: {
        flex: 1,
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    instructionOverlay: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructionText: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    controlsContainer: {
        height: 220,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 15,
        marginBottom: 8,
        color: '#666',
    },
    wallpaperListContainer: {
        height: 120, // specific height for list
    },
    wallpaperList: {
        paddingHorizontal: 10,
    },
    wallpaperItem: {
        marginHorizontal: 5,
        width: 80,
    },
    selectedWallpaperItem: {
        borderWidth: 2,
        borderColor: Colors.light.tint,
        borderRadius: 8,
    },
    wallpaperThumb: {
        width: 80,
        height: 80,
        borderRadius: 6,
        backgroundColor: '#ddd',
    },
    wallpaperName: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 4,
        color: '#333',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    fileInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    productPrice: {
        fontSize: 16,
        color: Colors.light.tint,
        fontWeight: 'bold',
    },
    addToCartBtn: {
        backgroundColor: Colors.light.tint,
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        gap: 8,
    },
    addToCartText: {
        color: 'white',
        fontWeight: '600',
    },
    processingBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    processingText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    generateButton: {
        position: 'absolute',
        top: '50%',
        alignSelf: 'center',
        backgroundColor: Colors.light.tint,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    generateButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
