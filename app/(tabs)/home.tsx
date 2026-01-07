import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 2;

export default function HomeScreen() {
    const router = useRouter();
    const { wallpapers, isLoading, error, loadWallpapers } = useWallpapersStore();
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [selectedColor, setSelectedColor] = useState("Todos");

    // Carousel State
    const [heroIndex, setHeroIndex] = useState(0);
    const heroWallpapers = wallpapers.slice(0, 5); // Use top 5 for carousel

    useEffect(() => {
        loadWallpapers();
    }, []);

    // Carousel Timer
    useEffect(() => {
        if (heroWallpapers.length === 0) return;
        const interval = setInterval(() => {
            setHeroIndex((prev) => (prev + 1) % heroWallpapers.length);
        }, 5000); // 5 seconds
        return () => clearInterval(interval);
    }, [heroWallpapers]);

    const categories = ["Todos", "Nuevos", "Florales", "Texturas", "Geométricos"];

    // Color Map for UI
    const colors = [
        { name: "Todos", hex: "transparent" },
        { name: "White", hex: "#FFFFFF", border: true },
        { name: "Beige", hex: "#F5F5DC" },
        { name: "Grey", hex: "#808080" },
        { name: "Black", hex: "#000000" },
        { name: "Gold", hex: "#FFD700" },
        { name: "Green", hex: "#4CAF50" },
        { name: "Blue", hex: "#2196F3" },
        { name: "Pink", hex: "#FFC0CB" }
    ];

    // Filter Logic
    const filteredWallpapers = React.useMemo(() => {
        // DEBUG: Inspect data structure (Check logs in terminal)
        if (wallpapers.length > 0) {
            console.log('[Home] Sample Wallpaper:', JSON.stringify(wallpapers[0], null, 2));
            const allCats = [...new Set(wallpapers.map(w => w.category))];
            const allColors = [...new Set(wallpapers.flatMap(w => w.colors || []))];
            console.log('[Home] Available Categories:', allCats);
            console.log('[Home] Available Colors:', allColors);
        }

        return wallpapers.filter(w => {
            // 1. Category Filter
            let matchesCategory = true;
            if (selectedCategory !== "Todos") {
                if (selectedCategory === "Nuevos") {
                    return true;
                } else {
                    // Try to match partial naming or logical mapping
                    // Force lower case check
                    const catName = (w.category || "").toLowerCase();
                    const itemName = (w.name || "").toLowerCase();

                    let searchTerm = "";
                    if (selectedCategory === "Florales") searchTerm = "floral"; // Lowercase
                    if (selectedCategory === "Texturas") searchTerm = "textur"; // Partial "textur" matches "Texture"
                    if (selectedCategory === "Geométricos") searchTerm = "geometr"; // Partial "geometr" matches "Geometric"

                    matchesCategory = (catName.includes(searchTerm) || itemName.includes(searchTerm));
                }
            }

            // 2. Color Filter
            let matchesColor = true;
            if (selectedColor !== "Todos") {
                if (!w.colors || !Array.isArray(w.colors)) {
                    matchesColor = false;
                } else {
                    // Multi-language map
                    const colorMap: Record<string, string[]> = {
                        "White": ["white", "blanco", "blanca"],
                        "Beige": ["beige", "crema", "cream"],
                        "Grey": ["grey", "gray", "gris", "plata"],
                        "Black": ["black", "negro", "negra"],
                        "Gold": ["gold", "dorado", "oro"],
                        "Green": ["green", "verde"],
                        "Blue": ["blue", "azul", "celeste"],
                        "Pink": ["pink", "rosa", "rosado"]
                    };

                    const targetColors = colorMap[selectedColor] || [selectedColor.toLowerCase()];

                    matchesColor = w.colors.some(c => {
                        if (!c) return false;
                        const cLower = c.toLowerCase();
                        return targetColors.some(start => cLower.includes(start));
                    });
                }
            }

            return matchesCategory && matchesColor;
        });
    }, [wallpapers, selectedCategory, selectedColor]);

    // Special case for "Nuevos" to limit results if no other filter applies? 
    // Actually, user wants "Nuevos" to be a category. 
    // Let's simplified: If "Nuevos", just slice the array.

    const displayedWallpapers = selectedCategory === "Nuevos"
        ? wallpapers.slice(0, 4)
        : filteredWallpapers;

    const renderHeader = () => {
        const currentHero = heroWallpapers[heroIndex];

        return (
            <View>
                {/* Hero Section (Carousel) */}
                {currentHero && (
                    <View style={styles.heroContainer}>
                        {/* Fade transition would be nice but simple state switch works for MVP */}
                        <Image
                            key={currentHero.id} // Force re-render on change
                            source={{ uri: currentHero.imageUrl }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.heroOverlay}
                        >
                            <Text style={styles.heroTitle}>ELEGANCIA ATEMPORAL</Text>
                            <Text style={styles.heroSubtitle}>Transforma cada rincón de tu hogar.</Text>

                            {/* Pagination Dots */}
                            <View style={styles.paginationConfig}>
                                {heroWallpapers.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.dot,
                                            i === heroIndex ? styles.dotActive : styles.dotInactive
                                        ]}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity style={styles.heroButton} onPress={() => router.push(`/wallpaper/${currentHero.id}`)}>
                                <Text style={styles.heroButtonText}>DESCUBRIR</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                )}

                {/* Visualizer Promo Banner */}
                <TouchableOpacity style={styles.visualizerBanner} onPress={() => router.push('/(tabs)/camera')}>
                    <View style={styles.visContent}>
                        <Ionicons name="scan-outline" size={28} color="black" />
                        <View style={{ marginLeft: 15 }}>
                            <Text style={styles.visTitle}>VISUALIZA EN TU HOGAR</Text>
                            <Text style={styles.visSubtitle}>Prueba nuestros papeles con IA en tu pared.</Text>
                        </View>
                    </View>
                    <Ionicons name="arrow-forward" size={24} color="black" />
                </TouchableOpacity>

                {/* Category Navigation */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                >
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.catItem, selectedCategory === cat && styles.catItemActive]}
                            onPress={() => setSelectedCategory(cat)}
                        >
                            <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                                {cat.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Color Navigation (Circles) */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.colorScroll}
                >
                    {colors.map((col) => (
                        <TouchableOpacity
                            key={col.name}
                            style={[
                                styles.colorItem,
                                selectedColor === col.name && styles.colorItemActive,
                                col.border ? { borderWidth: 1, borderColor: '#ddd' } : {}
                            ]}
                            onPress={() => setSelectedColor(col.name)}
                        >
                            {col.name === "Todos" ? (
                                <Ionicons name="color-palette-outline" size={20} color={selectedColor === "Todos" ? "black" : "#999"} />
                            ) : (
                                <View style={[styles.colorCircle, { backgroundColor: col.hex }]} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={styles.sectionTitle}>NUESTRA COLECCIÓN</Text>
            </View>
        );
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    paddingLeft: index % 2 === 0 ? 20 : 10,
                    paddingRight: index % 2 === 0 ? 10 : 20,
                    marginTop: index % 2 !== 0 ? 30 : 0 // Staggered grid effect
                }
            ]}
            onPress={() => router.push(`/wallpaper/${item.id}`)}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
                {/* Sale Tag Logic could go here */}
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={1}>{item.name.toUpperCase()}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)} /rollo</Text>

                {/* DEBUG INFO: REMOVE AFTER FIXING */}
                <Text style={{ fontSize: 9, color: 'red', textAlign: 'center' }}>
                    {item.category} / {item.colors?.join(',')}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (isLoading && wallpapers.length === 0) {
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
                    <TouchableOpacity onPress={() => { }}>
                        <Ionicons name="menu-outline" size={28} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.logoText}>VIZZARO PRO</Text>
                    <View style={styles.navIcons}>
                        <TouchableOpacity onPress={() => router.push('/search')} style={{ marginRight: 15 }}>
                            <Ionicons name="search-outline" size={24} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/cart')}>
                            <Ionicons name="bag-outline" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <FlatList
                ListHeaderComponent={renderHeader}
                data={displayedWallpapers} // Use the double-filtered list
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshing={isLoading}
                onRefresh={() => loadWallpapers(true)}
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f7f7f7',
    },
    logoText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 2,
        color: 'black',
    },
    navIcons: {
        flexDirection: 'row',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingBottom: 40,
    },

    // Hero
    heroContainer: {
        width: '100%',
        height: 450,
        marginBottom: 30,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 250,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 40,
    },
    heroTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 3,
        marginBottom: 5,
        textAlign: 'center',
    },
    heroSubtitle: {
        color: '#f0f0f0',
        fontSize: 14,
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    heroButton: {
        backgroundColor: 'white',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 0, // Sharp edges for York style
    },
    heroButtonText: {
        color: 'black',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 1,
    },

    // Pagination
    paginationConfig: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 4,
    },
    dotActive: {
        backgroundColor: 'white',
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotInactive: {
        backgroundColor: 'rgba(255,255,255,0.4)',
    },

    // Visualizer Banner
    visualizerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        marginHorizontal: 20,
        padding: 20,
        marginBottom: 30,
        borderLeftWidth: 3,
        borderLeftColor: 'black',
    },
    visContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    visTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    visSubtitle: {
        fontSize: 11,
        color: '#666',
    },

    // Categories
    categoryScroll: {
        paddingHorizontal: 20,
        marginBottom: 15, // Reduced space to fit colors
    },
    catItem: {
        marginRight: 25,
        paddingVertical: 5,
    },
    catItemActive: {
        borderBottomWidth: 2,
        borderBottomColor: 'black',
    },
    catText: {
        color: '#999',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    catTextActive: {
        color: 'black',
    },

    // Colors
    colorScroll: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    colorItem: {
        marginRight: 15,
        padding: 2,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    colorItemActive: {
        borderColor: 'black',
    },
    colorCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },

    // Grid
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: 2,
    },
    card: {
        width: ITEM_WIDTH,
        marginBottom: 30,
    },
    imageContainer: {
        width: '100%',
        height: 220,
        marginBottom: 10,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    cardContent: {
        alignItems: 'center', // Center text
    },
    name: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 4,
        color: '#333',
        textAlign: 'center',
    },
    price: {
        fontSize: 11,
        color: '#888',
        textAlign: 'center',
    },
});
