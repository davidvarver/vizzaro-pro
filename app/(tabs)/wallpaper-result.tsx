import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useCartStore } from '@/store/useCartStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useRecentStore } from '@/store/useRecentStore';
import { WallpaperOverlay } from '@/components/visualizer/WallpaperOverlay';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
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
    const { favoriteProjects, loadFavorites } = useFavoritesStore();
    const { recentIds, addRecent, loadRecents } = useRecentStore();

    const [selectedWallpaperId, setSelectedWallpaperId] = useState<string | null>(
        typeof initialWallpaperId === 'string' ? initialWallpaperId : null
    );

    // Filter/Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // Initial Load & Error Handling
    useEffect(() => {
        loadRecents();
        loadFavorites();

        if (aiProcessingFailed === 'true') {
            setTimeout(() => {
                Alert.alert(
                    'Optimization Needed',
                    'We couldn\'t detect the wall clearly. \n\nTips for a better result:\n• Ensure the room is well-lit 💡\n• Stand directly in front of the wall 📸\n• Avoid blurry or very dark photos 🚫',
                    [{ text: 'Got it' }]
                );
            }, 500);
        }
    }, [aiProcessingFailed]);

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

    const showProcessedImage = !!visualizerImage && (selectedWallpaperId === initialWallpaperId);
    const shouldUseOverlay = hasMask && !!currentWallpaper;

    const [isRegenerating, setIsRegenerating] = useState(false);

    // Handle Selection & Recent Tracking
    const handleSelectWallpaper = (id: string) => {
        setSelectedWallpaperId(id);
        addRecent(id);
    };

    const handleAddToCart = () => {
        if (!currentWallpaper) return;
        addToCart(currentWallpaper, 1, 5.33);
        Alert.alert('Success', 'Added to cart');
    };

    const handleRegenerate = async () => {
        if (!room || !currentWallpaper) return;

        try {
            setIsRegenerating(true);
            const userImageBase64 = room.image;
            const wallpaperUrl = currentWallpaper.imageUrl;
            const wallpaperBase64 = await fetchImageAsBase64(wallpaperUrl);
            const resultBase64 = await processImageWithAI(userImageBase64, wallpaperBase64);

            useWallpapersStore.getState().setVisualizerImage(resultBase64);
            router.setParams({ wallpaperId: currentWallpaper.id });
            setSelectedWallpaperId(currentWallpaper.id); // Triggers re-render with new context
        } catch (error) {
            console.error(error);
            Alert.alert(
                'Optimization Needed',
                'We couldn\'t apply the wallpaper. \n\nTips:\n• Ensure the room is well-lit.\n• Face the wall directly.\n• Avoid blurry photos.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsRegenerating(false);
        }
    };

    // --- Filtering & Sorting Logic ---
    const favoriteIds = useMemo(() => {
        const ids = new Set<string>();
        favoriteProjects.forEach(p => p.wallpapers.forEach(w => ids.add(w.id)));
        return ids;
    }, [favoriteProjects]);

    const filteredWallpapers = useMemo(() => {
        // 0. Base Filter: Exclude "Drying Mat" and non-wallpaper items if needed
        let result = wallpapers.filter(w => !w.name.toLowerCase().includes('drying mat'));

        // 1. Search Logic
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(w => w.name.toLowerCase().includes(q));
        }

        // 2. Favorites Filter
        if (showFavoritesOnly) {
            result = result.filter(w => favoriteIds.has(w.id));
        }

        // 3. Smart Sorting: Recent > Favorite > Default
        // Create a separate array to sort to avoid mutating the filtered result directly if it came from store
        return [...result].sort((a, b) => {
            const indexA = recentIds.indexOf(a.id);
            const indexB = recentIds.indexOf(b.id);

            // Score Logic:
            // Recent: 1000 - index (so 0 is 1000, 1 is 999...)
            // Favorite: +100 bonus
            // Default: 0

            const scoreA = (indexA !== -1 ? (1000 - indexA) : 0) + (favoriteIds.has(a.id) ? 100 : 0);
            const scoreB = (indexB !== -1 ? (1000 - indexB) : 0) + (favoriteIds.has(b.id) ? 100 : 0);

            return scoreB - scoreA;
        });

    }, [wallpapers, searchQuery, showFavoritesOnly, recentIds, favoriteIds]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: 'Visualizer',
                headerShown: true,
                headerBackTitle: 'Back',
                headerTintColor: Colors.light.tint
            }} />

            {/* --- Visualizer Area (Unchanged) --- */}
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
                        {isRegenerating ? (
                            <View style={styles.processingBadge}>
                                <ActivityIndicator size="small" color="white" />
                                <Text style={styles.processingText}>Generating...</Text>
                            </View>
                        ) : selectedWallpaperId !== initialWallpaperId ? (
                            <TouchableOpacity style={styles.generateButton} onPress={handleRegenerate}>
                                <Ionicons name="sparkles" size={20} color="white" />
                                <Text style={styles.generateButtonText}>Visualize AI</Text>
                            </TouchableOpacity>
                        ) : !aiProcessingFailed && (
                            <View style={styles.processingBadge}>
                                <ActivityIndicator size="small" color="white" />
                                <Text style={styles.processingText}>AI Enhanced</Text>
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
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={Colors.light.tint} />
                    </View>
                )}

                {/* Watermark Overlay */}
                {(showProcessedImage || (shouldUseOverlay && room)) && (
                    <View style={styles.watermarkContainer}>
                        <Image
                            source={require('../../assets/images/vizzaro-logo-watermark.png')}
                            style={styles.watermarkLogo}
                            resizeMode="contain"
                        />
                    </View>
                )}
            </View>

            {/* --- Controls Area (Enhanced) --- */}
            <View style={styles.controlsContainer}>

                {/* Search & Filter Bar */}
                <View style={styles.searchBarContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Ionicons name="search" size={16} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Find wallpaper..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={16} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}
                        onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    >
                        <Ionicons
                            name={showFavoritesOnly ? "heart" : "heart-outline"}
                            size={20}
                            color={showFavoritesOnly ? "white" : Colors.light.tint}
                        />
                    </TouchableOpacity>
                </View>

                {/* List Title */}
                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>
                        {showFavoritesOnly ? 'Favorites' : searchQuery ? 'Results' : 'Suggested for you'}
                    </Text>
                    {!showFavoritesOnly && !searchQuery && (
                        <Text style={styles.recentLabel}>Recent & Trending</Text>
                    )}
                </View>

                {/* Wallpaper List */}
                <View style={styles.wallpaperListContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wallpaperList}>
                        {filteredWallpapers.map(wp => {
                            const isFav = favoriteIds.has(wp.id);
                            return (
                                <TouchableOpacity
                                    key={wp.id}
                                    onPress={() => handleSelectWallpaper(wp.id)}
                                    style={[
                                        styles.wallpaperItem,
                                        selectedWallpaperId === wp.id && styles.selectedWallpaperItem
                                    ]}
                                >
                                    <View>
                                        <Image source={{ uri: wp.imageUrl }} style={styles.wallpaperThumb} />
                                        {isFav && (
                                            <View style={styles.favBadgeSmall}>
                                                <Ionicons name="heart" size={10} color="white" />
                                            </View>
                                        )}
                                    </View>
                                    <Text numberOfLines={1} style={styles.wallpaperName}>{wp.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        {filteredWallpapers.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No matches found</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Action Bar (Add to Cart) */}
                {currentWallpaper && (
                    <View style={styles.actionButtons}>
                        <View style={styles.fileInfo}>
                            <Text style={styles.productPrice}>${currentWallpaper.price.toFixed(2)}</Text>
                            <Text numberOfLines={1} style={styles.productName}>{currentWallpaper.name}</Text>
                        </View>
                        <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
                            <Ionicons name="cart" size={18} color="white" />
                            <Text style={styles.addToCartText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    visualizerContainer: { flex: 1, position: 'relative', backgroundColor: '#f0f0f0' },
    mainImage: { width: '100%', height: '100%' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Controls
    controlsContainer: {
        height: 260, // Increased height for search bar
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingVertical: 10,
    },

    // Search Bar
    searchBarContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 10,
        gap: 10,
        alignItems: 'center',
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        alignItems: 'center',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        height: '100%',
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    filterButtonActive: {
        backgroundColor: Colors.light.tint,
        borderColor: Colors.light.tint,
    },

    // List Headers
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 15,
        marginBottom: 5,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 15,
        color: '#333',
    },
    recentLabel: {
        fontSize: 10,
        color: Colors.light.tint,
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    // List
    wallpaperListContainer: { height: 130 },
    wallpaperList: { paddingHorizontal: 10 },
    wallpaperItem: { marginHorizontal: 5, width: 85 },
    selectedWallpaperItem: { borderWidth: 2, borderColor: Colors.light.tint, borderRadius: 8 },
    wallpaperThumb: { width: 85, height: 85, borderRadius: 6, backgroundColor: '#eaebed' },
    wallpaperName: { fontSize: 10, textAlign: 'center', marginTop: 4, color: '#333' },
    favBadgeSmall: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239, 68, 68, 0.9)', borderRadius: 10, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
    emptyState: { width: width - 40, justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
    emptyText: { color: '#999', fontSize: 13, fontStyle: 'italic' },

    // Footer Actions
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
    },
    fileInfo: { flex: 1, marginRight: 15 },
    productName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    productPrice: { fontSize: 15, color: Colors.light.tint, fontWeight: 'bold' },
    addToCartBtn: {
        backgroundColor: Colors.light.tint,
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 25,
        alignItems: 'center',
        gap: 6,
    },
    addToCartText: { color: 'white', fontWeight: '600', fontSize: 13 },

    // Overlay Elements
    processingBadge: {
        position: 'absolute', top: 20, right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    processingText: { color: 'white', fontSize: 12, fontWeight: '600' },
    generateButton: {
        position: 'absolute', top: '50%', alignSelf: 'center',
        backgroundColor: Colors.light.tint,
        paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 30,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
    },
    generateButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    watermarkContainer: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent black Frame
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    watermarkLogo: {
        width: 100,
        height: 30,
    }
});
