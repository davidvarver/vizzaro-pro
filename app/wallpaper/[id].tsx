import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useCartStore } from '@/store/useCartStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function WallpaperDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { getWallpaperById, isLoading } = useWallpapersStore();
    const { addToCart } = useCartStore();
    const { addToFavorites } = useFavoritesStore();

    const [wallpaper, setWallpaper] = useState<any>(null);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        if (typeof id === 'string') {
            const wp = getWallpaperById(id);
            if (wp) {
                setWallpaper(wp);
            }
        }
    }, [id, getWallpaperById]);

    const handleAddToCart = () => {
        if (wallpaper) {
            addToCart(wallpaper, 1, 5.33);
            alert('Agregado al carrito');
        }
    };

    const handleAddToFavorites = () => {
        if (wallpaper) {
            addToFavorites(wallpaper.name, 'General', wallpaper); // Default room type
            alert('Agregado a favoritos');
        }
    };

    const handleVisualize = () => {
        // Navigate to Camera, passing this wallpaper ID to pre-select it eventually?
        // Or just go to camera.
        router.push('/(tabs)/camera');
        // Ideally we'd pass ?preselect=${wallpaper.id} but Camera needs to support it.
    };

    if (!wallpaper) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={Colors.light.tint} />
                <Text>Cargando producto...</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backText}>Volver</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const images = wallpaper.imageUrls && wallpaper.imageUrls.length > 0 ? wallpaper.imageUrls : [wallpaper.imageUrl];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Image Carousel */}
                <View style={styles.imageContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const slide = Math.ceil(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                            setActiveImage(slide);
                        }}
                    >
                        {images.map((img: string, index: number) => (
                            <Image key={index} source={{ uri: img }} style={styles.mainImage} resizeMode="cover" />
                        ))}
                    </ScrollView>
                    <View style={styles.pagination}>
                        {images.map((_: any, index: number) => (
                            <View key={index} style={[styles.dot, index === activeImage && styles.activeDot]} />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.backBtnOverlay} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.titleRow}>
                        <Text style={styles.name}>{wallpaper.name}</Text>
                        <Text style={styles.price}>${wallpaper.price.toFixed(2)}</Text>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="scan-outline" size={16} color="#666" />
                            <Text style={styles.metaText}>{wallpaper.category}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="color-palette-outline" size={16} color="#666" />
                            <Text style={styles.metaText}>{wallpaper.style}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Descripción</Text>
                    <Text style={styles.description}>{wallpaper.description || 'Sin descripción disponible.'}</Text>

                    <Text style={styles.sectionTitle}>Especificaciones</Text>
                    <View style={styles.specsContainer}>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>Material</Text>
                            <Text style={styles.specValue}>{wallpaper.specifications?.material}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>Dimensiones</Text>
                            <Text style={styles.specValue}>
                                {wallpaper.dimensions?.width}m x {wallpaper.dimensions?.height}m
                            </Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>Lavable</Text>
                            <Text style={styles.specValue}>{wallpaper.specifications?.washable ? 'Sí' : 'No'}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.iconBtn} onPress={handleAddToFavorites}>
                    <Ionicons name="heart-outline" size={24} color={Colors.light.tint} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.visualizeBtn} onPress={handleVisualize}>
                    <Ionicons name="camera-outline" size={24} color="white" />
                    <Text style={styles.visualizeText}>Visualizar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart}>
                    <Text style={styles.cartText}>Agregar al Carrito</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    imageContainer: {
        height: 350,
        position: 'relative',
    },
    mainImage: {
        width: width,
        height: 350,
    },
    pagination: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 10,
        height: 10,
    },
    backBtnOverlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailsContainer: {
        padding: 20,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    price: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.light.tint,
    },
    metaRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    metaText: {
        marginLeft: 5,
        color: '#666',
        fontSize: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 10,
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
    },
    specsContainer: {
        marginTop: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 15,
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    specLabel: {
        color: '#666',
    },
    specValue: {
        fontWeight: '500',
        color: '#333',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 15,
    },
    iconBtn: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
    },
    visualizeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#333',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    visualizeText: {
        color: 'white',
        fontWeight: '600',
    },
    cartBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.tint,
        paddingVertical: 14,
        borderRadius: 12,
    },
    cartText: {
        color: 'white',
        fontWeight: 'bold',
    },
    backButton: {
        marginTop: 20,
        padding: 10,
    },
    backText: {
        color: Colors.light.tint,
        textDecorationLine: 'underline',
    },
});
