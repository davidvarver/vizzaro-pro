import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, DimensionValue } from 'react-native';
import { Wallpaper } from '@/constants/wallpapers';
import Colors from '@/constants/colors';

interface WallpaperCardProps {
    item: Wallpaper;
    onPress: (item: Wallpaper) => void;
    width: DimensionValue;
}

export const WallpaperCard = ({ item, onPress, width }: WallpaperCardProps) => {
    return (
        <TouchableOpacity
            style={[styles.gridCard, { width }]}
            onPress={() => onPress(item)}
        >
            <View style={styles.gridImageContainer}>
                <Image
                    source={{ uri: item.imageUrls?.[0] || item.imageUrl }}
                    style={styles.gridImage}
                    resizeMode="cover"
                />
            </View>
            <View style={styles.gridInfo}>
                <Text style={styles.gridName} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={styles.gridPrice}>${item.price}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    gridCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    gridImageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: Colors.light.border,
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    gridInfo: {
        padding: 12,
        gap: 4,
    },
    gridName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        lineHeight: 18,
    },
    gridPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
});
