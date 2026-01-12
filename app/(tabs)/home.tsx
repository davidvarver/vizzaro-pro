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
    const { home, common } = require('@/utils/units').translations;
    // We map internal category names to display names if needed, but for now we update state init
    const [selectedCategory, setSelectedCategory] = useState(home.filters.all);
    const [selectedColor, setSelectedColor] = useState(home.filters.colors.all);

    // Carousel State
    const [heroIndex, setHeroIndex] = useState(0);
    const heroWallpapers = React.useMemo(() => {
        // 1. Filter out mats
        const candidates = wallpapers.filter(w =>
            !w.category?.toLowerCase().includes('mat') &&
            !w.category?.toLowerCase().includes('tapete') &&
            !w.name.toLowerCase().includes('bath mat') &&
            !w.name.toLowerCase().includes('drying mat') &&
            !w.name.toLowerCase().includes('stone mat')
        );

        // 2. Group by model to ensure diversity (avoid showing 5 colors of same pattern)
        const groups = new Map();
        candidates.forEach(w => {
            const key = w.group || w.id;
            if (!groups.has(key)) {
                groups.set(key, w); // Just keep the first one found for this group
            }
        });

        // 3. Convert to array and Shuffle
        const distinctModels = Array.from(groups.values())
            .sort(() => 0.5 - Math.random()); // Simple shuffle

        // 4. Take top 5 distinct models
        const standard = distinctModels.slice(0, 5);

        // Add Bath Mats promo slide
        // We look for a representative image or use a static one if needed
        const bathMatExample = wallpapers.find(w =>
            w.category?.toLowerCase().includes('mat') ||
            w.category?.toLowerCase().includes('tapete') ||
            w.name.toLowerCase().includes('drying mat')
        );

        if (bathMatExample) {
            return [...standard, { ...bathMatExample, isPromo: true, name: "Bath Mats Collection", description: "Soft & Absorbent" }];
        }

        return standard;
    }, [wallpapers]);

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

    const categories = [
        home.filters.all,
        home.filters.new,
        home.filters.floral,
        home.filters.texture,
        home.filters.geometric,
        home.filters.kids
    ];

    // Color Map for UI
    const colors = [
        { name: home.filters.colors.all, hex: "transparent" },
        { name: home.filters.colors.white, hex: "#FFFFFF" },
        { name: home.filters.colors.beige, hex: "#F5F5DC" },
        { name: home.filters.colors.grey, hex: "#808080" },
        { name: home.filters.colors.black, hex: "#000000" },
        { name: home.filters.colors.gold, hex: "#FFD700" },
        { name: home.filters.colors.green, hex: "#4CAF50" },
        { name: home.filters.colors.blue, hex: "#2196F3" },
        { name: home.filters.colors.pink, hex: "#FFC0CB" }
    ];

    // Helper: Remove accents and lower case
    const normalize = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Color Mapping (Moved out for reuse)
    // We map English display names to known data values (which might still be mixed/Spanish in DB)
    const colorMap: Record<string, string[]> = {
        [home.filters.colors.white]: ["white", "blanco", "blanca", "off-white"],
        [home.filters.colors.beige]: ["beige", "crema", "cream"],
        [home.filters.colors.grey]: ["grey", "gray", "gris", "plata"],
        [home.filters.colors.black]: ["black", "negro", "negra"],
        [home.filters.colors.gold]: ["gold", "dorado", "oro"],
        [home.filters.colors.green]: ["green", "verde"],
        [home.filters.colors.blue]: ["blue", "azul", "celeste", "navy"],
        [home.filters.colors.pink]: ["pink", "rosa", "rosado"]
    };

    // Dynamic Available Colors
    const availableColors = React.useMemo(() => {
        const foundColors = new Set<string>();
        wallpapers.forEach(w => {
            w.colors?.forEach(c => {
                if (c) foundColors.add(normalize(c));
            });
        });

        // Always show "All" + only colors that exist in the loaded wallpapers
        return colors.filter(uiColor => {
            if (uiColor.name === home.filters.all) return true;

            const targets = colorMap[uiColor.name] || [uiColor.name.toLowerCase()];
            // Check if ANY of the targets match ANY of the found colors
            return targets.some(target => {
                // We check if the found color contains the target (e.g. found "dark green" matches "green")
                // or if the target contains the found color (less likely but possible for exact matches)
                for (const found of foundColors) {
                    if (found.includes(target)) return true;
                }
                return false;
            });
        });
    }, [wallpapers]);

    // Filter Logic
    const filteredWallpapers = React.useMemo(() => {
        // Step 1: Filter by Category and Color
        const filtered = wallpapers.filter(w => {
            // 1. Category Filter
            let matchesCategory = true;
            if (selectedCategory !== home.filters.all && selectedCategory !== home.filters.new) {
                const catName = normalize(w.category || "");
                const itemName = normalize(w.name || "");

                // Simple mapping for categories
                let searchTerm = "";
                if (selectedCategory === home.filters.floral) searchTerm = "floral";
                if (selectedCategory === home.filters.texture) searchTerm = "textur"; // Works for textura/texture
                if (selectedCategory === home.filters.geometric) searchTerm = "geometr"; // Partial matches "Geometric"

                if (selectedCategory === home.filters.kids) {
                    const kidsKeywords = ["kid", "child", "infant", "bebe", "baby", "nino", "nina", "disney", "marvel", "toy story", "cartoon", "juvenil", "princess"];
                    matchesCategory = kidsKeywords.some(k => catName.includes(k) || itemName.includes(k));
                } else {
                    // Fallback: If no mapping, use the category name itself
                    if (!searchTerm) searchTerm = normalize(selectedCategory);

                    matchesCategory = (catName.includes(searchTerm) || itemName.includes(searchTerm));
                }
            }

            // 2. Color Filter
            let matchesColor = true;
            if (selectedColor !== home.filters.colors.all) {
                if (!w.colors || w.colors.length === 0) {
                    matchesColor = false;
                } else {
                    const mapped = colorMap[selectedColor] || [normalize(selectedColor)];
                    const wColorsNorm = w.colors.filter(c => c).map(c => normalize(c));
                    matchesColor = mapped.some(m => wColorsNorm.some(wc => wc.includes(m)));
                }
            }

            // 3. Exclude 'Bath Mats' (Tapetes) from main grid
            // We want them ONLY in the carousel
            const isBathMat = w.category?.toLowerCase().includes('mat') ||
                w.category?.toLowerCase().includes('tapete') ||
                w.name.toLowerCase().includes('tapete') ||
                w.name.toLowerCase().includes('bath mat') ||
                w.name.toLowerCase().includes('drying mat') ||
                w.name.toLowerCase().includes('stone mat');

            if (isBathMat) return false;

            return matchesCategory && matchesColor;
        });

        // Step 2: Deduplicate by Group (Show only one variant per group)
        // IMPORTANT: If a specific color is selected, we naturally only show that variant!
        // But if "All" is selected (or no color filter), we want to deduplicate.

        const uniqueMap = new Map();
        filtered.forEach(w => {
            if (w.group) {
                // Check if we already have a variant for this group
                if (!uniqueMap.has(w.group)) {
                    uniqueMap.set(w.group, w);
                }
            } else {
                // If doesn't belong to a group, use ID itself
                uniqueMap.set(w.id, w);
            }
        });

        return Array.from(uniqueMap.values());
    }, [wallpapers, selectedCategory, selectedColor]);

    // Special case for "New" to limit results if no other filter applies?
    // Actually, we should use filteredWallpapers even for "New" to ensure deduplication applies.
    const displayedWallpapers = React.useMemo(() => {
        if (selectedCategory === home.filters.new) {
            // Return first 6 items from the deduplicated list
            return filteredWallpapers.slice(0, 6);
        }
        return filteredWallpapers;
    }, [selectedCategory, filteredWallpapers]);

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
                            <Text style={styles.heroTitle}>{home.heroTitle}</Text>
                            <Text style={styles.heroSubtitle}>{home.heroSubtitle}</Text>

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

                            <TouchableOpacity style={styles.heroButton} onPress={() => {
                                if ((currentHero as any).isPromo) {
                                    // Navigate to filtered search for Bath Mats
                                    router.push({ pathname: "/search", params: { category: "mat" } } as any);
                                } else {
                                    router.push(`/product/${currentHero.id}` as any);
                                }
                            }}>
                                <Text style={styles.heroButtonText}>
                                    {(currentHero as any).isPromo ? home.heroButton : home.heroButton}
                                </Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                )}

                {/* Visualizer Promo Banner */}
                <TouchableOpacity style={styles.visualizerBanner} onPress={() => router.push('/(tabs)/camera')}>
                    <View style={styles.visContent}>
                        <Ionicons name="scan-outline" size={28} color="black" />
                        <View style={{ marginLeft: 15 }}>
                            <Text style={styles.visTitle}>{home.visualizerTitle}</Text>
                            <Text style={styles.visSubtitle}>{home.visualizerSubtitle}</Text>
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

                {/* Color Navigation (Text Pills) */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.colorScroll}
                >
                    {availableColors.map((col) => (
                        <TouchableOpacity
                            key={col.name}
                            style={[
                                styles.colorItem,
                                selectedColor === col.name && styles.colorItemActive
                            ]}
                            onPress={() => setSelectedColor(col.name)}
                        >
                            <Text style={[styles.colorText, selectedColor === col.name && styles.colorTextActive]}>
                                {col.name.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={styles.sectionTitle}>{home.collectionTitle}</Text>
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
            onPress={() => router.push(`/product/${item.id}` as any)}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
                {/* Sale Tag Logic could go here */}
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={1}>{item.name.toUpperCase()}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)} {common.pricePerRoll || "/roll"}</Text>
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
                    <Image
                        source={require('@/assets/images/logo-header.png')}
                        style={{ width: 140, height: 40 }}
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
        marginRight: 10,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#f9f9f9',
    },
    colorItemActive: {
        borderColor: 'black',
        backgroundColor: 'black',
    },
    colorText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        color: '#666',
    },
    colorTextActive: {
        color: 'white',
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
