import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar, Platform, useWindowDimensions, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useCartStore } from '@/store/useCartStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { translations, formatDimension, cmToInches } from '@/utils/units';

const { width } = Dimensions.get('window');

export default function WallpaperDetailScreen() {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isLargeScreen = windowWidth > 768; // Desktop breakpoint

    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { wallpapers, loadWallpapers, loadWallpaperDetails, isLoading } = useWallpapersStore();
    const { addToCart } = useCartStore();
    const { addToFavorites } = useFavoritesStore();

    const [wallpaper, setWallpaper] = useState<any>(null);
    const [activeImage, setActiveImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);

    // Calculator State
    const [showCalculator, setShowCalculator] = useState(false);
    const [wallWidth, setWallWidth] = useState('');
    const [wallHeight, setWallHeight] = useState('');
    const [unit, setUnit] = useState<'ft' | 'm'>('ft'); // Unit Toggle
    const [calculatedRolls, setCalculatedRolls] = useState<number | null>(null);

    // Calculator Logic
    useEffect(() => {
        if (!wallpaper || !wallWidth || !wallHeight) {
            setCalculatedRolls(null);
            return;
        }

        const w = parseFloat(wallWidth);
        const h = parseFloat(wallHeight);

        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
            setCalculatedRolls(null);
            return;
        }

        // Convert wall dimensions to meters based on selected unit
        let wallWidthM = w;
        let wallHeightM = h;

        if (unit === 'ft') {
            wallWidthM = w * 0.3048;
            wallHeightM = h * 0.3048;
        }
        // if unit === 'm', values are already in meters (input assumes meters for metric)

        // Parse Dimensions (Handle Object or String)
        let rollWidthM = 0.53; // default
        let rollLengthM = 10.05; // default

        // CASE 1: Object format (York)
        if (wallpaper.dimensions && typeof wallpaper.dimensions === 'object' && wallpaper.dimensions.width) {
            rollWidthM = Number(wallpaper.dimensions.width) || 0.53;
            rollLengthM = Number(wallpaper.dimensions.height) || 10.05;
        }
        // CASE 2: String format (Gimmersta - e.g. "50cm x 10.05m" or "2.7m x 2m")
        else if (wallpaper.dimensions && typeof wallpaper.dimensions === 'string') {
            const dimString = wallpaper.dimensions.toLowerCase();
            // Regex to find numbers followed by units
            // matches: ["53cm", "53", "cm"], ["10.05m", "10.05", "m"]
            const parts = dimString.match(/(\d+(\.\d+)?)\s*(cm|m|in|ft)?/g);

            if (parts && parts.length >= 2) {
                // Helper to convert any unit string to meters
                const parseUnitToM = (valStr: string) => {
                    const num = parseFloat(valStr.replace(/[^\d.]/g, ''));
                    if (valStr.includes('cm')) return num / 100;
                    if (valStr.includes('in') || valStr.includes('"')) return num * 0.0254;
                    if (valStr.includes('ft') || valStr.includes("'")) return num * 0.3048;
                    // Default to meters if no unit or 'm'
                    return num;
                };

                // Assume first number is width, second is height (standard)
                rollWidthM = parseUnitToM(parts[0]);
                rollLengthM = parseUnitToM(parts[1]);
            }
        }

        // Parse Repeat
        // Gimmersta strings "53cm" need parsing too if patternRepeat is not numeric
        let repeatM = 0;
        if (typeof wallpaper.patternRepeat === 'number') {
            repeatM = wallpaper.patternRepeat / 100; // cm to m
        } else if (typeof wallpaper.patternRepeat === 'string') {
            // Handle "53 cm" or "64cm"
            const repStr = String(wallpaper.patternRepeat).toLowerCase();
            const num = parseFloat(repStr.replace(/[^\d.]/g, ''));
            if (repStr.includes('cm')) repeatM = num / 100;
            else if (repStr.includes('in')) repeatM = num * 0.0254;
            else repeatM = num / 100; // default assumption cm
        } else if (typeof wallpaper.repeat === 'string') {
            // Sometimes mapped as 'repeat'
            const repStr = String(wallpaper.repeat).toLowerCase();
            const num = parseFloat(repStr.replace(/[^\d.]/g, ''));
            if (num > 0) {
                if (repStr.includes('cm')) repeatM = num / 100;
                else if (repStr.includes('m')) repeatM = num;
            }
        }

        console.log('Calc Debug:', { wallWidthM, wallHeightM, rollWidthM, rollLengthM, repeatM });

        // Formula:
        // 1. Drops needed
        const drops = Math.ceil(wallWidthM / rollWidthM);

        // 2. Length per drop (Height + Trim + Repeat for matching)
        // We add 10cm trim (0.1m) + 1 repeat just to be safe for matching
        const trim = 0.1;
        const lengthPerDrop = wallHeightM + trim + repeatM;

        // 3. Drops per roll
        const dropsPerRoll = Math.floor(rollLengthM / lengthPerDrop);

        // 4. Total rolls
        if (dropsPerRoll > 0) {
            const rolls = Math.ceil(drops / dropsPerRoll);
            setCalculatedRolls(rolls);
        } else {
            // If height > roll length (unlikely for standard walls but possible for murals or stairs)
            // Fallback: Total area / Roll area * 1.2 safety factor
            const areaWall = wallWidthM * wallHeightM;
            const areaRoll = rollWidthM * rollLengthM;
            const approximate = Math.ceil((areaWall / areaRoll) * 1.2);
            setCalculatedRolls(approximate);
        }

    }, [wallWidth, wallHeight, wallpaper, unit]);

    // 1. Auto-load data if missing (e.g. reload on detail page)
    useEffect(() => {
        if (wallpapers.length === 0) {
            loadWallpapers();
        }
    }, [wallpapers.length, loadWallpapers]);

    // ... (rest of code)

    // 2. React to data changes (once loaded)
    useEffect(() => {
        if (typeof id === 'string') {
            const wp = wallpapers.find(w => w.id === id);
            if (wp) {
                setWallpaper(wp);
            }
        }
    }, [id, wallpapers]);

    // 3. Fetch Full Details (Lite Mode Support)
    useEffect(() => {
        if (typeof id === 'string') {
            loadWallpaperDetails(id);
        }
    }, [id, loadWallpaperDetails]);

    const { product } = translations;

    const handleAddToCart = () => {
        if (wallpaper) {
            addToCart(wallpaper, quantity, 5.33 * quantity);
            // Show success state briefly
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
        }
    };

    const handleOrderSample = () => {
        if (wallpaper) {
            addToCart(wallpaper, 1, 0, 'sample');
            alert('Sample added to cart');
        }
    };

    const handleAddToFavorites = () => {
        if (wallpaper) {
            addToFavorites(wallpaper.name, 'General', wallpaper); // Default room type
            alert('Added to favorites');
        }
    };

    // Variant Logic
    const relatedVariants = React.useMemo(() => {
        if (!wallpaper || !wallpaper.group) return [];
        return wallpapers.filter(w => w.group === wallpaper.group && w.id !== wallpaper.id);
    }, [wallpaper, wallpapers]);

    const allVariants = React.useMemo(() => {
        if (!wallpaper || !wallpaper.group) return [];
        return wallpapers.filter(w => w.group === wallpaper.group);
    }, [wallpaper, wallpapers]);


    const handleVisualize = () => {
        router.push({
            pathname: '/(tabs)/camera',
            params: { wallpaperId: wallpaper.id }
        });
    };

    // 3. Handle "Not Found" state
    if (!isLoading && wallpapers.length > 0 && !wallpaper) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ marginBottom: 20 }}>Product not found</Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.cartButton}>
                    <Text style={styles.cartText}>GO HOME</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!wallpaper) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="black" />
            </View>
        );
    }

    const images = wallpaper.imageUrls && wallpaper.imageUrls.length > 0 ? wallpaper.imageUrls : [wallpaper.imageUrl];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <ScrollView contentContainerStyle={[
                styles.scrollContent,
                isLargeScreen && styles.scrollContentDesktop
            ]} showsVerticalScrollIndicator={false}>
                {/* Navbar Overlay */}
                <View style={isLargeScreen ? styles.navBarDesktop : styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddToFavorites} style={styles.navButton}>
                        <Ionicons name="heart-outline" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                <View style={[
                    styles.mainLayout,
                    isLargeScreen && styles.mainLayoutDesktop
                ]}>
                    {/* Left Column: Image Carousel */}
                    <View style={[
                        styles.carouselContainer,
                        isLargeScreen && styles.carouselContainerDesktop
                    ]}>
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(e) => {
                                const slide = Math.ceil(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                                setActiveImage(slide);
                            }}
                        >
                            {images.map((img: string, index: number) => (
                                <Image
                                    key={index}
                                    source={{ uri: img }}
                                    style={[
                                        styles.mainImage,
                                        isLargeScreen ? { width: windowWidth * 0.55, height: windowHeight * 0.85 } : { width: windowWidth, height: 550 }
                                    ]}
                                    resizeMode="cover"
                                />
                            ))}
                        </ScrollView>

                        {/* Pagination Dots */}
                        {images.length > 1 && (
                            <View style={styles.pagination}>
                                {images.map((_: any, index: number) => (
                                    <View key={index} style={[styles.dot, index === activeImage && styles.activeDot]} />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Right Column: Content */}
                    <View style={[
                        styles.contentContainer,
                        isLargeScreen && styles.contentContainerDesktop
                    ]}>
                        {/* Header Info */}
                        <Text style={styles.category}>{wallpaper.category.toUpperCase()}</Text>
                        <Text style={styles.title}>{wallpaper.name}</Text>
                        <Text style={styles.price}>${wallpaper.price.toFixed(2)} <Text style={styles.perRoll}> {product.pricePerRoll.toUpperCase()}</Text></Text>

                        {/* Variant Selector (If variants exist) */}
                        {allVariants.length > 1 && (
                            <View style={styles.variantContainer}>
                                <Text style={styles.variantLabel}>COLOR:</Text>
                                <View style={styles.variantRow}>
                                    {allVariants.map((variant) => (
                                        <TouchableOpacity
                                            key={variant.id}
                                            style={[
                                                styles.variantOption,
                                                variant.id === wallpaper.id && styles.variantOptionActive
                                            ]}
                                            onPress={() => {
                                                router.replace(`/product/${variant.id}` as any);
                                            }}
                                        >
                                            <Image source={{ uri: variant.imageUrl }} style={styles.variantImage} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.variantName}>{wallpaper.colors?.[0] || 'Standard'}</Text>
                            </View>
                        )}

                        <View style={styles.divider} />

                        {/* Actions */}
                        <View style={styles.actionContainer}>
                            {/* Wall Calculator */}
                            <View style={styles.calculatorValues}>
                                <TouchableOpacity
                                    style={styles.calcToggle}
                                    onPress={() => setShowCalculator(!showCalculator)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="calculator-outline" size={20} color="#000" />
                                        <Text style={styles.calcToggleText}>HOW MANY ROLLS DO I NEED?</Text>
                                    </View>
                                    <Ionicons name={showCalculator ? "chevron-up" : "chevron-down"} size={20} color="#000" />
                                </TouchableOpacity>

                                {showCalculator && (
                                    <View style={styles.calculatorContainer}>
                                        <Text style={styles.calcInstruction}>
                                            Enter your wall dimensions to calculate required rolls.
                                            We account for pattern repeat ({wallpaper.patternRepeat ? cmToInches(wallpaper.patternRepeat) : '0"'}) automatically.
                                        </Text>

                                        <View style={styles.unitToggleContainer}>
                                            <TouchableOpacity
                                                style={[styles.unitButton, unit === 'ft' && styles.unitButtonActive]}
                                                onPress={() => setUnit('ft')}
                                            >
                                                <Text style={[styles.unitText, unit === 'ft' && styles.unitTextActive]}>FEET (ft)</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.unitButton, unit === 'm' && styles.unitButtonActive]}
                                                onPress={() => setUnit('m')}
                                            >
                                                <Text style={[styles.unitText, unit === 'm' && styles.unitTextActive]}>METERS (m)</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.calcInputs}>
                                            <View style={styles.calcInputGroup}>
                                                <Text style={styles.calcLabel}>WIDTH ({unit})</Text>
                                                <TextInput
                                                    style={styles.calcInput}
                                                    keyboardType="numeric"
                                                    value={wallWidth}
                                                    onChangeText={setWallWidth}
                                                    placeholder={unit === 'ft' ? "10" : "3.00"}
                                                />
                                            </View>
                                            <View style={styles.calcInputGroup}>
                                                <Text style={styles.calcLabel}>HEIGHT ({unit})</Text>
                                                <TextInput
                                                    style={styles.calcInput}
                                                    keyboardType="numeric"
                                                    value={wallHeight}
                                                    onChangeText={setWallHeight}
                                                    placeholder={unit === 'ft' ? "8" : "2.40"}
                                                />
                                            </View>
                                        </View>

                                        {calculatedRolls !== null && (
                                            <View style={styles.calcResult}>
                                                <Text style={styles.resultText}>YOU NEED:</Text>
                                                <Text style={styles.resultNumber}>{calculatedRolls} ROLLS</Text>
                                                <TouchableOpacity
                                                    style={styles.applyButton}
                                                    onPress={() => {
                                                        setQuantity(calculatedRolls);
                                                        setShowCalculator(false);
                                                    }}
                                                >
                                                    <Text style={styles.applyButtonText}>UPDATE QUANTITY</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            <View style={styles.divider} />

                            {/* Quantity Selector */}
                            <View style={styles.quantityContainer}>
                                <Text style={styles.quantityLabel}>QUANTITY:</Text>
                                <View style={styles.quantityControls}>
                                    <TouchableOpacity
                                        style={styles.qtyButton}
                                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                    >
                                        <Ionicons name="remove" size={20} color="#000" />
                                    </TouchableOpacity>
                                    <View style={styles.qtyInput}>
                                        <Text style={styles.qtyText}>{quantity}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.qtyButton}
                                        onPress={() => setQuantity(quantity + 1)}
                                    >
                                        <Ionicons name="add" size={20} color="#000" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.visualizeButton} onPress={handleVisualize}>
                                <Ionicons name="scan-outline" size={18} color="white" style={{ marginRight: 10 }} />
                                <Text style={styles.visualizeText}>{product.visualize.toUpperCase()}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.cartButton, addedToCart && styles.cartButtonSuccess]}
                                onPress={handleAddToCart}
                                disabled={addedToCart}
                            >
                                <Text style={[styles.cartText, addedToCart && styles.cartTextSuccess]}>
                                    {addedToCart ? "ADDED TO CART" : product.addToCart.toUpperCase()}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.sampleButton} onPress={handleOrderSample}>
                                <Text style={styles.sampleText}>ORDER A SAMPLE ($5.00)</Text>
                                <Text style={styles.sampleSubtext}>+ $0.99 shipping</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{product.description}</Text>
                            <Text style={styles.description}>
                                {wallpaper.description || 'Exclusive high-quality design, ideal for transforming any space with elegance and style.'}
                            </Text>
                        </View>

                        {/* Specifications */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{product.specifications}</Text>

                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>STYLE</Text>
                                <Text style={styles.specValue}>{wallpaper.style}</Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>{product.material.toUpperCase()}</Text>
                                <Text style={styles.specValue}>{wallpaper.specifications?.material || 'Non-Woven'}</Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>{product.dimensions.toUpperCase()}</Text>
                                <Text style={styles.specValue}>
                                    {formatDimension(wallpaper.dimensions?.width, 'm')} x {formatDimension(wallpaper.dimensions?.height, 'm')} (roll)
                                </Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>{product.washability.toUpperCase()}</Text>
                                <Text style={styles.specValue}>{wallpaper.specifications?.washable ? 'Yes' : 'No'}</Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>COLORS</Text>
                                <Text style={styles.specValue}>{wallpaper.colors?.join(', ')}</Text>
                            </View>
                            <View style={styles.specRow}>
                                <Text style={styles.specLabel}>{product.patternRepeat.toUpperCase()}</Text>
                                <Text style={styles.specValue}>
                                    {wallpaper.patternRepeat ? cmToInches(wallpaper.patternRepeat) : '0"'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // ... [existing styles kept implicitly by location, just ensuring TextInput is imported above and these new styles are added] ...

    // Calculator Styles
    calculatorValues: {
        marginBottom: 20,
    },
    calcToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 16,
        backgroundColor: '#fafafa',
    },
    calcToggleText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#000',
    },
    calculatorContainer: {
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#ddd',
        padding: 20,
        backgroundColor: '#fff',
    },
    // New Unit Toggle Styles
    unitToggleContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    unitButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    unitButtonActive: {
        backgroundColor: '#000',
    },
    unitText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666',
        letterSpacing: 1,
    },
    unitTextActive: {
        color: '#fff',
    },
    // End Unit Toggle
    calcInstruction: {
        fontSize: 12,
        color: '#666',
        marginBottom: 20,
        lineHeight: 18,
    },
    calcInputs: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    calcInputGroup: {
        flex: 1,
    },
    calcLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        color: '#333',
    },
    calcInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        height: 44,
        paddingHorizontal: 12,
        fontSize: 16,
    },
    calcResult: {
        alignItems: 'center',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    resultText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        color: '#666',
        marginBottom: 4,
    },
    resultNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        marginBottom: 16,
    },
    applyButton: {
        backgroundColor: '#000',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 0,
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 40,
        backgroundColor: '#fff',
    },
    // Desktop: Container centered
    scrollContentDesktop: {
        alignItems: 'center',
        width: '100%',
    },
    // Desktop: Row Layout
    mainLayout: {
        width: '100%',
        flexDirection: 'column',
    },
    mainLayoutDesktop: {
        flexDirection: 'row',
        maxWidth: 1400,
        alignSelf: 'center',
        justifyContent: 'center',
        paddingTop: 80, // Space for navbar
    },
    navBar: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    navBarDesktop: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 20,
        flexDirection: 'row',
        gap: 20,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    carouselContainer: {
        width: '100%',
        height: 550,
        position: 'relative',
        marginBottom: 20,
    },
    carouselContainerDesktop: {
        width: '55%', // Left Column Width
        height: 'auto', // Allow full height
        marginBottom: 0,
    },
    mainImage: {
        width: width,
        height: 550,
    },
    pagination: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 8,
        height: 8,
    },
    contentContainer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    contentContainerDesktop: {
        width: '45%', // Right Column Width
        paddingHorizontal: 60, // Generous padding
        paddingTop: 20,
    },
    // York Typography Updates
    category: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 1,
        color: '#888',
        textAlign: 'left',
        marginBottom: 10,
        marginTop: 10,
    },
    title: {
        fontSize: 32, // Larger for desktop feel
        fontWeight: '400',
        letterSpacing: 0, // Normal tracking for serif
        color: '#000',
        lineHeight: 40,
        textAlign: 'left',
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    price: {
        fontSize: 20,
        fontWeight: '500',
        color: '#000',
        textAlign: 'left',
        marginBottom: 30,
        letterSpacing: 0.5,
    },
    perRoll: {
        fontSize: 13,
        fontWeight: '400',
        color: '#666',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        width: '100%',
        marginVertical: 30,
    },

    // Variants (Square/Rectangular)
    variantContainer: {
        alignItems: 'flex-start', // Left align
        marginBottom: 25,
    },
    variantLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#333',
        letterSpacing: 1,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    variantRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    variantOption: {
        width: 50,
        height: 50,
        borderRadius: 0, // Square
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 2,
    },
    variantOptionActive: {
        borderColor: '#000',
        borderWidth: 2,
    },
    variantImage: {
        width: '100%',
        height: '100%',
        borderRadius: 0, // Square image
    },
    variantName: {
        fontSize: 12,
        color: '#555',
        marginTop: 4,
        letterSpacing: 0.5,
        fontStyle: 'italic',
    },

    // Actions
    actionContainer: {
        width: '100%',
        marginBottom: 40,
        gap: 12,
    },
    visualizeButton: {
        flexDirection: 'row',
        backgroundColor: '#000',
        height: 54, // Taller touch target
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 0,
    },
    visualizeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 2,
    },
    cartButton: {
        backgroundColor: '#fff',
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 0,
    },
    cartText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 2,
    },

    // Sections
    section: {
        marginBottom: 35,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 15,
        color: '#000',
        textAlign: 'left',
        textTransform: 'uppercase',
    },
    description: {
        fontSize: 15,
        lineHeight: 26,
        color: '#444',
        textAlign: 'left',
    },

    // Specs
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    specLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#777',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    specValue: {
        fontSize: 13,
        color: '#222',
        fontWeight: '400',
    },

    // Quantity Selector
    quantityContainer: {
        marginBottom: 10,
    },
    quantityLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#333',
        letterSpacing: 1,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        alignSelf: 'flex-start',
        height: 44,
    },
    qtyButton: {
        width: 44,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    qtyInput: {
        width: 60,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    qtyText: {
        fontSize: 16,
        fontWeight: '500',
    },

    // Sample Button
    sampleButton: {
        marginTop: 10,
        alignItems: 'center',
        paddingVertical: 10,
    },
    sampleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
        textDecorationLine: 'underline',
        letterSpacing: 1,
    },
    sampleSubtext: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
    },

    // Success State
    cartButtonSuccess: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    cartTextSuccess: {
        color: '#fff',
    },
});
