import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { Wallpaper } from '@/constants/wallpapers';

interface WallpaperCardProps {
    wallpaper: Wallpaper;
    onPress: (wallpaper: Wallpaper) => void;
    width?: string | number;
}

export const WallpaperCard: React.FC<WallpaperCardProps> = ({ wallpaper, onPress, width = '48%' }) => {
    return (
        <TouchableOpacity
            style={[styles.card, { width }]}
            onPress={() => onPress(wallpaper)}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: wallpaper.imageUrls?.[0] || wallpaper.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
                {!wallpaper.inStock && (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Agotado</Text>
                    </View>
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                    {wallpaper.name}
                </Text>
                <Text style={styles.category} numberOfLines={1}>
                    {wallpaper.category} {"•"} {wallpaper.style}
                </Text>
                <Text style={styles.price}>desde ${wallpaper.price}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.light.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.light.border,
        marginBottom: 12, // Added margin bottom for flow in grids
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: Colors.light.border,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    outOfStockBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    outOfStockText: {
        color: Colors.light.background,
        fontSize: 12,
        fontWeight: '600',
    },
    info: {
        padding: 12,
        gap: 4,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        lineHeight: 18,
    },
    category: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
});
