import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Platform, DimensionValue } from 'react-native';
import { Theme } from '@/constants/theme';
import { Wallpaper } from '@/constants/wallpapers';

interface WallpaperCardProps {
    item: Wallpaper;
    onPress: (item: Wallpaper) => void;
    width?: DimensionValue;
}

export const WallpaperCard = ({ item, onPress, width }: WallpaperCardProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleMouseEnter = () => {
        if (Platform.OS === 'web') {
            Animated.spring(scaleAnim, {
                toValue: 1.05,
                useNativeDriver: true,
                friction: 7,
                tension: 40
            }).start();
        }
    };

    const handleMouseLeave = () => {
        if (Platform.OS === 'web') {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 7,
                tension: 40
            }).start();
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, width ? { width } : undefined]}
            onPress={() => onPress(item)}
            activeOpacity={0.9}
            //@ts-ignore - Web props
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <View style={styles.imageContainer}>
                <Animated.Image
                    source={{ uri: item.imageUrl }}
                    style={[
                        styles.image,
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                    resizeMode="cover"
                />
                {!item.inStock && (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
                    </View>
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
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
        aspectRatio: 3 / 4, // Portrait for York style
        borderRadius: 0,
        overflow: 'hidden',
        backgroundColor: Theme.colors.backgroundSecondary,
        marginBottom: 12,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    info: {
        alignItems: 'center', // York centers text usually
        paddingHorizontal: 4,
    },
    name: {
        fontFamily: Theme.typography.fontFamily.serif,
        fontSize: 14,
        color: Theme.colors.text,
        marginBottom: 4,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    price: {
        fontFamily: Theme.typography.fontFamily.sans,
        fontSize: 12,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
    },
    outOfStockBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    outOfStockText: {
        color: 'white',
        fontSize: 10,
        fontFamily: Theme.typography.fontFamily.sansBold,
        letterSpacing: 1,
    },
});
