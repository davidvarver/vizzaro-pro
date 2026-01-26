import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, DimensionValue, Platform } from 'react-native';
import { Wallpaper } from '@/constants/wallpapers';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useFavoritesStore } from '@/store/useFavoritesStore';

interface WallpaperCardProps {
    item: Wallpaper;
    onPress: (item: Wallpaper) => void;
    onVisualize?: (item: Wallpaper) => void;
    width: DimensionValue;
}

export const WallpaperCard = ({ item, onPress, onVisualize, width }: WallpaperCardProps) => {
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const favored = isFavorite(item.id);

    return (
        <TouchableOpacity
            style={[styles.container, { width }]}
            onPress={() => onPress(item)}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.imageUrls?.[0] || item.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Favorite Button */}
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item);
                    }}
                >
                    <Ionicons
                        name={favored ? "heart" : "heart-outline"}
                        size={20}
                        color={favored ? "#E63946" : "#000"}
                    />
                </TouchableOpacity>

                {!item.inStock && (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                )}

                {onVisualize && (
                    <TouchableOpacity
                        style={styles.visualizerIconFromCard}
                        onPress={(e) => {
                            e.stopPropagation();
                            onVisualize(item);
                        }}
                    >
                        <Ionicons name="eye-outline" size={18} color="#333" />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        backgroundColor: 'transparent',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.85,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: Colors.light.backgroundSecondary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 12,
        position: 'relative', // for absolute children
    },
    image: {
        width: '100%',
        height: '100%',
    },
    info: {
        paddingHorizontal: 4,
    },
    name: {
        fontSize: 15,
        fontFamily: 'PlayfairDisplay_600SemiBold',
        color: Colors.light.text,
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    price: {
        fontSize: 14,
        fontFamily: 'Lato_400Regular',
        color: Colors.light.textSecondary,
        fontWeight: '500',
    },
    outOfStockBadge: {
        position: 'absolute',
        top: 10,
        left: 10, // Moved to left to avoid clash with heart
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 2,
    },
    outOfStockText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255,255,255,0.85)',
        width: 32, height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        zIndex: 10,
    },
    visualizerIconFromCard: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        width: 32, height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    }
});
