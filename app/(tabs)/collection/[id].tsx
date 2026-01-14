import React, { useEffect } from 'react';
import { useWindowDimensions, View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { WallpaperCard } from '@/components/WallpaperCard';
import { Ionicons } from '@expo/vector-icons';

export default function CollectionDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { wallpapers, loadWallpapers, isLoading, error } = useWallpapersStore();
    const collectionName = typeof id === 'string' ? decodeURIComponent(id) : '';

    // Calculate columns based on screen width
    let numColumns = 2;
    if (width > 600) numColumns = 3;
    if (width > 900) numColumns = 4;
    if (width > 1200) numColumns = 5;

    // Calculate gap and item width
    const gap = 15; // Increased gap for airy feel
    const padding = 20; // Container padding
    const availableWidth = width - (padding * 2) - (gap * (numColumns - 1));
    const itemWidth = availableWidth / numColumns;

    useEffect(() => {
        if (collectionName) {
            loadWallpapers(collectionName);
        }
    }, [collectionName]);

    // Deduplicate wallpapers by Group ID
    const uniqueWallpapers = React.useMemo(() => {
        const seenGroups = new Set();
        return wallpapers.filter(item => {
            const groupId = item.group || item.id;
            if (seenGroups.has(groupId)) {
                return false;
            }
            seenGroups.add(groupId);
            return true;
        });
    }, [wallpapers]);

    const renderItem = ({ item }: { item: any }) => (
        <View style={{ width: itemWidth, marginBottom: 20 }}>
            <WallpaperCard
                item={item}
                onPress={() => router.push(`/(tabs)/product/${item.id}` as any)}
                width={'100%'}
            />
        </View>
    );

    if (isLoading && wallpapers.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ title: collectionName || 'Collection' }} />
                <ActivityIndicator size="large" color="#000" />
                <Text style={styles.loadingText}>Loading collection...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Stack.Screen options={{ title: 'Error' }} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => loadWallpapers(collectionName)} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: collectionName.toUpperCase(),
                    headerBackTitle: 'Books',
                    headerTintColor: '#000',
                    headerTitleStyle: {
                        fontFamily: 'serif',
                        fontSize: 16,
                    }
                }}
            />

            <FlatList
                key={`grid-${numColumns}`} // Force re-render when columns change
                data={uniqueWallpapers}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                contentContainerStyle={[styles.listContent, { paddingHorizontal: padding }]}
                columnWrapperStyle={{ gap: gap }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>No wallpapers found in this collection.</Text>
                    </View>
                }
            />
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    listContent: {
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#666',
        letterSpacing: 0.5
    },
    errorText: {
        marginBottom: 15,
        color: 'red',
        textAlign: 'center'
    },
    retryButton: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5
    },
    retryText: {
        color: '#333'
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
        fontStyle: 'italic'
    }
});
