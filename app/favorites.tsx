import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { Wallpaper } from '@/constants/wallpapers';

export default function FavoritesScreen() {
    const router = useRouter();
    const { favoriteProjects, loadFavorites, removeFromFavorites, removeWallpaperFromProject } = useFavoritesStore();

    useEffect(() => {
        loadFavorites();
    }, []);

    // Helper to extract wallpapers from projects for a simple list view
    // Or display projects? The store seems project-based.
    // "favoriteProjects" has "wallpapers" array. 
    // Let's display projects for now, or a flattened list of liked wallpapers if likely 1 project per user or similar?
    // User might expect "Wishlist". Store calls them "Projects".
    // Let's list Projects.

    const renderProject = ({ item }: { item: any }) => (
        <View style={styles.projectCard}>
            <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{item.name}</Text>
                <TouchableOpacity onPress={() => removeFromFavorites(item.id)}>
                    <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
            </View>
            <Text style={styles.roomType}>{item.roomType}</Text>

            <FlatList
                data={item.wallpapers}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(w) => w.id}
                renderItem={({ item: wallpaper }: { item: Wallpaper }) => (
                    <TouchableOpacity
                        style={styles.wallpaperChip}
                        onPress={() => router.push(`/wallpaper/${wallpaper.id}`)}
                    >
                        <Image source={{ uri: wallpaper.imageUrl }} style={styles.thumb} />
                        <Text numberOfLines={1} style={styles.wpName}>{wallpaper.name}</Text>
                        <TouchableOpacity
                            style={styles.removeWp}
                            onPress={() => removeWallpaperFromProject(item.id, wallpaper.id)}
                        >
                            <Ionicons name="close-circle" size={16} color="#666" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.wpList}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Text style={styles.title}>My Projects</Text>
            </View>

            {favoriteProjects.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No saved projects</Text>
                    <Text style={styles.subText}>Save your favorites to see them here</Text>
                </View>
            ) : (
                <FlatList
                    data={favoriteProjects}
                    renderItem={renderProject}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    list: {
        padding: 15,
    },
    projectCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    projectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    projectName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    roomType: {
        fontSize: 14,
        color: '#888',
        marginBottom: 15,
    },
    wpList: {
        gap: 10,
    },
    wallpaperChip: {
        width: 100,
        marginRight: 10,
    },
    thumb: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: '#eee',
        marginBottom: 5,
    },
    wpName: {
        fontSize: 12,
        color: '#555',
        marginBottom: 2,
    },
    removeWp: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 10,
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
    },
});
