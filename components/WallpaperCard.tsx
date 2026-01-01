import React, { useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, DimensionValue, Animated, Platform } from 'react-native';
import { Wallpaper } from '@/constants/wallpapers';
import Colors from '@/constants/colors';

interface WallpaperCardProps {
    item: Wallpaper;
    onPress: (item: Wallpaper) => void;
    width: DimensionValue;
}

export const WallpaperCard = ({ item, onPress, width }: WallpaperCardProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Web-specific hover handling
    const handleMouseEnter = () => {
        if (Platform.OS === 'web') {
            Animated.spring(scaleAnim, {
                toValue: 1.1,
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
            style={[styles.container, { width }]}
            onPress={() => onPress(item)}
            activeOpacity={0.9}
            //@ts-ignore - Web props
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <View style={styles.imageContainer}>
                <Animated.Image
                    source={{ uri: item.imageUrls?.[0] || item.imageUrl }}
                    style={[
                        styles.image,
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                    resizeMode="cover"
                />
                {!item.inStock && (
                    <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Agotado</Text>
                    </View>
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
        backgroundColor: 'transparent', // Cleaner look, no card background
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 0.85, // Taller, more elegant ratio
        borderRadius: 4, // Sharper corners for modern look
        overflow: 'hidden',
        backgroundColor: Colors.light.backgroundSecondary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 12,
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
        fontFamily: 'PlayfairDisplay_600SemiBold', // Elegant Serif
        color: Colors.light.text,
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    price: {
        fontSize: 14,
        fontFamily: 'Lato_400Regular', // Clean Sans
        color: Colors.light.textSecondary,
        fontWeight: '500',
    },
    outOfStockBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
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
});
