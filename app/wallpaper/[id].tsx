import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
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

    const { product } = require('@/utils/units').translations;
    const { formatDimension, cmToInches } = require('@/utils/units');

    const handleAddToCart = () => {
        if (wallpaper) {
            addToCart(wallpaper, 1, 5.33); // Keep price calc as is for now
            alert('Added to cart');
        }
    };

    const handleAddToFavorites = () => {
        if (wallpaper) {
            addToFavorites(wallpaper.name, 'General', wallpaper); // Default room type
            alert('Added to favorites');
        }
    };

    // Variant Logic
    const { wallpapers } = useWallpapersStore();
    const relatedVariants = React.useMemo(() => {
        if (!wallpaper || !wallpaper.group) return [];
        return wallpapers.filter(w => w.group === wallpaper.group && w.id !== wallpaper.id);
    }, [wallpaper, wallpapers]);

    const allVariants = React.useMemo(() => {
        if (!wallpaper || !wallpaper.group) return [];
        return wallpapers.filter(w => w.group === wallpaper.group);
    }, [wallpaper, wallpapers]);


    const handleVisualize = () => {
        router.push({
            pathname: '/(tabs)/camera',
            params: { wallpaperId: wallpaper.id }
        });
    };

    if (!wallpaper) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="black" />
            </View>
        );
    }

    const images = wallpaper.imageUrls && wallpaper.imageUrls.length > 0 ? wallpaper.imageUrls : [wallpaper.imageUrl];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Navbar Overlay */}
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddToFavorites} style={styles.navButton}>
                        <Ionicons name="heart-outline" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                {/* Hero Image / Carousel */}
                <View style={styles.carouselContainer}>
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

                    {/* Pagination Dots */}
                    {images.length > 1 && (
                        <View style={styles.pagination}>
                            {images.map((_: any, index: number) => (
                                <View key={index} style={[styles.dot, index === activeImage && styles.activeDot]} />
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    {/* Header Info */}
                    <Text style={styles.category}>{wallpaper.category.toUpperCase()}</Text>
                    <Text style={styles.title}>{wallpaper.name.toUpperCase()}</Text>
                    <Text style={styles.price}>${wallpaper.price.toFixed(2)} <Text style={styles.perRoll}> {product.pricePerRoll.toUpperCase()}</Text></Text>

                    {/* Variant Selector (If variants exist) */}
                    {allVariants.length > 1 && (
                        <View style={styles.variantContainer}>
                            <Text style={styles.variantLabel}>COLOR:</Text>
                            <View style={styles.variantRow}>
                                {allVariants.map((variant) => (
                                    <TouchableOpacity
                                        key={variant.id}
                                        style={[
                                            styles.variantOption,
                                            variant.id === wallpaper.id && styles.variantOptionActive
                                        ]}
                                        onPress={() => {
                                            router.replace(`/wallpaper/${variant.id}`);
                                        }}
                                    >
                                        <Image source={{ uri: variant.imageUrl }} style={styles.variantImage} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.variantName}>{wallpaper.colors?.[0] || 'Standard'}</Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Actions */}
                    <TouchableOpacity style={styles.visualizeButton} onPress={handleVisualize}>
                        <Ionicons name="scan-outline" size={20} color="white" style={{ marginRight: 10 }} />
                        <Text style={styles.visualizeText}>{product.visualize.toUpperCase()}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
                        <Text style={styles.cartText}>{product.addToCart}</Text>
                    </TouchableOpacity>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{product.description}</Text>
                        <Text style={styles.description}>
                            {wallpaper.description || 'Exclusive high-quality design, ideal for transforming any space with elegance and style.'}
                        </Text>
                    </View>

                    {/* Specifications */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{product.specifications}</Text>

                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>STYLE</Text>
                            <Text style={styles.specValue}>{wallpaper.style}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>{product.material.toUpperCase()}</Text>
                            <Text style={styles.specValue}>{wallpaper.specifications?.material || 'Non-Woven'}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>{product.dimensions.toUpperCase()}</Text>
                            <Text style={styles.specValue}>
                                {formatDimension(wallpaper.dimensions?.width, 'm')} x {formatDimension(wallpaper.dimensions?.height, 'm')} (roll)
                            </Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>{product.washability.toUpperCase()}</Text>
                            <Text style={styles.specValue}>{wallpaper.specifications?.washable ? 'Yes' : 'No'}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>COLORS</Text>
                            <Text style={styles.specValue}>{wallpaper.colors?.join(', ')}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specLabel}>{product.patternRepeat.toUpperCase()}</Text>
                            <Text style={styles.specValue}>
                                {wallpaper.patternRepeat ? cmToInches(wallpaper.patternRepeat) : '0"'}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    navBar: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    carouselContainer: {
        width: '100%',
        height: 500, // Taller, more impressive image
        position: 'relative',
    },
    mainImage: {
        width: width,
        height: 500,
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
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 8,
        height: 8,
    },
    contentContainer: {
        padding: 24,
    },
    category: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        color: '#999',
        textAlign: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '400', // Elegance often implies lighter weights
        letterSpacing: 1,
        color: 'black',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: 'System', // Use default legible font
    },
    price: {
        fontSize: 18,
        fontWeight: '600',
        color: 'black',
        textAlign: 'center',
        marginBottom: 20,
    },
    perRoll: {
        fontSize: 12,
        fontWeight: '400',
        color: '#666',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        width: '40%',
        alignSelf: 'center',
        marginBottom: 30,
    },

    // Variants
    variantContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    variantLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#999',
        letterSpacing: 1,
        marginBottom: 10,
    },
    variantRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 8,
    },
    variantOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'transparent',
        padding: 2, // gap between image and border
    },
    variantOptionActive: {
        borderColor: 'black',
    },
    variantImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    variantName: {
        fontSize: 12,
        color: '#333',
    },

    // Actions
    visualizeButton: {
        flexDirection: 'row',
        backgroundColor: 'black',
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderRadius: 0, // Sharp corners for premium feel
    },
    visualizeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    cartButton: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: 'black',
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        borderRadius: 0,
    },
    cartText: {
        color: 'black',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },

    // Sections
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        lineHeight: 24,
        color: '#555',
        textAlign: 'center',
    },

    // Specs
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    specLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#999',
        letterSpacing: 1,
    },
    specValue: {
        fontSize: 12,
        color: '#333',
    },
});
