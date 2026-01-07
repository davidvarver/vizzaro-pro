import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { WallpaperOverlay } from '@/components/visualizer/WallpaperOverlay';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/store/useCartStore';

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

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'Visualizador',
                headerShown: true,
                headerBackTitle: 'Cámara',
                headerTintColor: Colors.light.tint
            }} />

            <View style={styles.visualizerContainer}>
                {shouldUseOverlay && room ? (
                    <WallpaperOverlay
                        originalImage={room.image} // stored as base64
                        maskImage={room.maskImage!}
                        patternImage={currentWallpaper!.imageUrl}
                        opacity={0.85}
                    />
                ) : showProcessedImage ? (
                    <Image
                        source={{ uri: formatUri(visualizerImage) }}
                        style={styles.mainImage}
                        resizeMode="cover"
                    />
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
    }
});
