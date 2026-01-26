import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, StatusBar, useWindowDimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { WallpaperCard } from '@/components/WallpaperCard';

export default function FavoritesScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { favoriteProjects, loadFavorites } = useFavoritesStore();

    useEffect(() => {
        loadFavorites();
    }, []);

    // Flatten all wallpapers from all projects into a single unique list
    const allFavorites = useMemo(() => {
        const uniqueMap = new Map();
        favoriteProjects.forEach(project => {
            project.wallpapers.forEach(wp => {
                if (!uniqueMap.has(wp.id)) {
                    uniqueMap.set(wp.id, wp);
                }
            });
        });
        return Array.from(uniqueMap.values());
    }, [favoriteProjects]);

    // Grid Logic
    let numColumns = 2;
    if (width >= 768 && width < 1024) numColumns = 3;
    if (width >= 1024) numColumns = 5;

    const ITEM_WIDTH = width / numColumns;

    const renderItem = ({ item }: { item: any }) => (
        <View style={{ width: ITEM_WIDTH, padding: 10, marginBottom: 10 }}>
            <WallpaperCard
                item={item}
                onPress={() => router.push(`/(tabs)/product/${encodeURIComponent(item.id)}` as any)}
                width={'100%'}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.title}>FAVORITES</Text>
                    <Text style={styles.subtitle}>{allFavorites.length} ITEMS SAVED</Text>
                </View>
            </SafeAreaView>

            {allFavorites.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No favorites yet</Text>
                    <Text style={styles.subText}>Tap the heart icon on any wallpaper to add it here.</Text>
                </View>
            ) : (
                <FlatList
                    key={`fav-grid-${numColumns}`}
                    data={allFavorites}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={numColumns}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    safeArea: {
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f7f7f7',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 2,
        color: 'black',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 11,
        color: '#888',
        letterSpacing: 1,
    },
    list: {
        paddingVertical: 10,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
        marginTop: 20,
    },
    subText: {
        fontSize: 14,
        color: '#999',
        marginTop: 10,
        textAlign: 'center',
        lineHeight: 20,
    },
});
