import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { WallpaperCard } from '@/components/WallpaperCard';
import { Ionicons } from '@expo/vector-icons';

export default function CollectionDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { wallpapers, loadWallpapers, isLoading, error } = useWallpapersStore();
    const collectionName = typeof id === 'string' ? decodeURIComponent(id) : '';

    useEffect(() => {
        if (collectionName) {
            loadWallpapers(collectionName);
        }
    }, [collectionName]);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.cardContainer}>
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
                data={wallpapers}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
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
        padding: 10,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    cardContainer: {
        width: '49%',
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
