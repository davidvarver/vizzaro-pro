import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, useWindowDimensions, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { collections, isLoading, loadCollections } = useWallpapersStore();

    // Grid Calculation Logic
    // Mobile: 2 cols | Tablet: 3 cols | Desktop: 5 cols
    // Grid Calculation Logic
    // Mobile: 2 cols | Foldable/Tablet: 3 cols | Desktop: 5 cols
    let numColumns = 2;
    if (width >= 600 && width < 1024) { // Lowered from 768 to 600 to catch Foldable inner screens
        numColumns = 3;
    } else if (width >= 1024) {
        numColumns = 5;
    }

    const ITEM_WIDTH = width / numColumns;

    useEffect(() => {
        loadCollections();
    }, []);

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Image
                source={{ uri: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800' }}
                style={styles.heroImage}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.heroOverlay}
            >
                <Text style={styles.heroTitle}>OUR COLLECTIONS</Text>
                <Text style={styles.heroSubtitle}>Explore our exclusive wallpaper books</Text>
            </LinearGradient>
        </View>
    );

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    width: ITEM_WIDTH,
                    paddingLeft: 10,
                    paddingRight: 10,
                    marginBottom: 20
                }
            ]}
            onPress={() => router.push(`/(tabs)/collection/${encodeURIComponent(item.id)}` as any)}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.image, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="images-outline" size={40} color="#ccc" />
                    </View>
                )}
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={1}>{item.name.toUpperCase()}</Text>
                <Text style={styles.count}>{item.count} items</Text>
            </View>
        </TouchableOpacity>
    );

    if (isLoading && collections.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="black" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.navBar}>
                    <Image
                        source={require('@/assets/images/logo-header.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <View style={styles.navIcons}>
                        <TouchableOpacity onPress={() => router.push('/search' as any)} style={{ marginRight: 15 }}>
                            <Ionicons name="search-outline" size={24} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/cart')}>
                            <Ionicons name="bag-outline" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <FlatList
                key={numColumns} // Forces re-render on resize
                ListHeaderComponent={renderHeader}
                data={collections}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshing={isLoading}
                onRefresh={loadCollections}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={{ marginTop: 20, color: '#888' }}>No collections found.</Text>
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
    safeArea: {
        backgroundColor: '#fff',
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f7f7f7',
        position: 'relative',
    },
    logoImage: {
        width: 180,
        height: 50,
    },
    navIcons: {
        flexDirection: 'row',
        position: 'absolute',
        right: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingBottom: 40,
    },
    headerContainer: {
        width: '100%',
        height: 250,
        marginBottom: 20,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        justifyContent: 'center',
        alignItems: 'center'
    },
    heroTitle: {
        fontSize: 28,
        color: 'white',
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 8,
        textAlign: 'center'
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#f0f0f0',
        letterSpacing: 1,
        fontStyle: 'italic'
    },
    card: {
        // Width is handled dynamically in renderItem
    },
    imageContainer: {
        width: '100%',
        height: 200,
        marginBottom: 10,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    cardContent: {
        alignItems: 'center',
        marginTop: 5,
    },
    name: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#333',
        textAlign: 'center',
        marginBottom: 4
    },
    count: {
        fontSize: 11,
        color: '#888',
        textAlign: 'center',
    }
});
