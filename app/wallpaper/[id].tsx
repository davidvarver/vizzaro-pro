import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import {
  ArrowLeft,
  Share2,
  Minus,
  Plus,
  Layers,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useCartStore } from '@/store/useCartStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { SeoHead } from '@/components/SeoHead';

import { getBaseName, formatDimensionsImperial } from '@/utils/product';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 1024;

export default function WallpaperDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const getWallpaperById = useWallpapersStore((s) => s.getWallpaperById);
  const wallpapers = useWallpapersStore((s) => s.wallpapers);
  const addToCart = useCartStore((s) => s.addToCart);
  const cartItems = useCartStore((s) => s.cartItems);
  const addToHistory = useHistoryStore((s) => s.addToHistory);

  const favoriteProjects = useFavoritesStore((s) => s.favoriteProjects);
  const addToFavorites = useFavoritesStore((s) => s.addToFavorites);
  const removeFromFavorites = useFavoritesStore((s) => s.removeFromFavorites);
  const addWallpaperToProject = useFavoritesStore((s) => s.addWallpaperToProject);
  const removeWallpaperFromProject = useFavoritesStore((s) => s.removeWallpaperFromProject);

  const wallpaper = getWallpaperById(id || '');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcHeight, setCalcHeight] = useState('');
  const [calcWidth, setCalcWidth] = useState('');
  const [calculatedRolls, setCalculatedRolls] = useState(0);

  const calculateRolls = () => {
    if (!wallpaper || !calcHeight || !calcWidth) return;

    const wHeightM = parseFloat(calcHeight) * 0.3048; // ft to m
    const wWidthM = parseFloat(calcWidth) * 0.3048;   // ft to m

    // Roll specs (defaulting if missing)
    const rollWidth = wallpaper.dimensions?.width || 0.53;
    const rollLength = wallpaper.dimensions?.height || 10.05;

    // Pattern Repeat (inches to m)
    const repeatM = (wallpaper.patternRepeat || 0) * 0.0254;

    // Calc Strips
    // Height needed per strip = Wall Height + Repeat + Trim Buffer (10cm)
    const heightPerStrip = wHeightM + repeatM + 0.1;

    // Strips possible per roll
    const stripsPerRoll = Math.floor(rollLength / heightPerStrip);

    if (stripsPerRoll <= 0) {
      // Wall is taller than a single roll? Fallback to crude area calc + 20%
      const wallArea = wHeightM * wWidthM;
      const rollArea = rollWidth * rollLength;
      const rolls = Math.ceil((wallArea * 1.2) / rollArea);
      setCalculatedRolls(Math.max(1, rolls));
      return;
    }

    // Total strips needed for width
    const stripsNeeded = Math.ceil(wWidthM / rollWidth);

    // Total rolls
    const rollsNeeded = Math.ceil(stripsNeeded / stripsPerRoll);
    setCalculatedRolls(Math.max(1, rollsNeeded));
  };

  // ...

  // Find variants: Same base name (include current one to show in list)
  const variants = React.useMemo(() => {
    if (!wallpaper) return [];
    const currentBase = getBaseName(wallpaper.name);
    return wallpapers.filter(w => getBaseName(w.name) === currentBase);
  }, [wallpaper, wallpapers]);

  // Favorites Logic (Simple "General" list)
  const defaultProjectName = "Mis Favoritos";
  const favoritesProject = favoriteProjects.find(p => p.name === defaultProjectName);
  const isFavorite = favoritesProject?.wallpapers.some(w => w.id === wallpaper?.id);

  const toggleFavorite = async () => {
    if (!wallpaper) return;

    if (isFavorite && favoritesProject) {
      // Remove from existing project
      if (favoritesProject.wallpapers.length === 1) {
        // If it's the last one, maybe remove the project? Or just empty it. Context says "Cannot remove last wallpaper" logic might be there?
        // Actually context says: if updatedWallpapers.length === 0, it returns.
        // Let's safe guard.
        await removeFromFavorites(favoritesProject.id); // Remove entire project if empty? Or just leave it.
        // The context method `removeWallpaperFromProject` prevents removing the last one?
        // "Cannot remove last wallpaper from project" log.
        // Better to just delete the project if it's the only one, or use a context method that allows empty.
        // Let's assume for now we use the context as is. If strict, I might need to make a new project.
        // Actually, if I can't remove the last one, I'll delete the project.
        await removeFromFavorites(favoritesProject.id);
      } else {
        await removeWallpaperFromProject(favoritesProject.id, wallpaper.id);
      }
    } else {
      if (favoritesProject) {
        await addWallpaperToProject(favoritesProject.id, wallpaper);
      } else {
        // Create new "Mis Favoritos" project
        await addToFavorites(defaultProjectName, 'General', wallpaper);
      }
    }
  };

  // Zoom State
  const [zoomStyle, setZoomStyle] = useState({ opacity: 0, x: 0, y: 0 });

  useEffect(() => {
    if (wallpaper) {
      addToHistory(wallpaper);
    }
  }, [wallpaper]);

  if (!wallpaper) {
    return <View style={styles.center}><ActivityIndicator color={Colors.light.primary} /></View>;
  }

  // Use all available images or fallback to main
  const images = wallpaper.imageUrls && wallpaper.imageUrls.length > 0
    ? wallpaper.imageUrls
    : [wallpaper.imageUrl];

  const handleMouseMove = (event: any) => {
    if (Platform.OS === 'web') {
      const { layerX, layerY, target } = event.nativeEvent;
      // Simple heuristic for hover zoom behavior
      const width = target.clientWidth;
      const height = target.clientHeight;

      const xPercent = (layerX / width) * 100;
      const yPercent = (layerY / height) * 100;

      setZoomStyle({
        opacity: 1,
        x: xPercent,
        y: yPercent
      });
    }
  };

  const handleMouseLeave = () => {
    setZoomStyle(prev => ({ ...prev, opacity: 0 }));
  };



  // ... (inside component)

  const activeImageUrl = images[activeImage] || wallpaper.imageUrl;

  return (
    <View style={styles.mainContainer}>
      <SeoHead
        title={`${wallpaper.name} - Papel Tapiz Premium`}
        description={wallpaper.description ? wallpaper.description.substring(0, 160) : `Compra ${wallpaper.name} - Papel Tapiz de alta calidad. Precio: $${wallpaper.price}. Envío Gratis.`}
        image={activeImageUrl}
        type="product"
        productData={{
          price: wallpaper.price,
          currency: 'MXN',
          availability: 'InStock',
          brand: 'Vizzaro'
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Navigation */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ArrowLeft color={Colors.light.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.brandLogo}>VIZZARO</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleFavorite} style={styles.iconButton}>
              <Heart
                color={isFavorite ? Colors.light.primary : Colors.light.text}
                fill={isFavorite ? Colors.light.primary : 'transparent'}
                size={24}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(tabs)/cart')}
            >
              <ShoppingCart color={Colors.light.text} size={24} />
              {cartItems.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartItems.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Share2 color={Colors.light.text} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.contentWrapper, IS_DESKTOP && styles.desktopLayout]}>

          {/* LEFT COLUMN: IMAGES */}
          <View style={[styles.imageSection, IS_DESKTOP && styles.desktopImageSection]}>
            <View
              style={styles.mainImageWrapper}
              //@ts-ignore - Web hover events
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <Image
                source={{ uri: images[activeImage] }}
                style={styles.mainImage}
                resizeMode="cover"
              />

              {/* Web Magnifier Lens Effect */}
              {Platform.OS === 'web' && (
                <View
                  style={[
                    styles.magnifier,
                    {
                      opacity: zoomStyle.opacity,
                      backgroundImage: `url(${images[activeImage]})`,
                      backgroundPosition: `${zoomStyle.x}% ${zoomStyle.y}%`,
                      backgroundSize: '250%', // 2.5x Zoom
                      left: `${zoomStyle.x}%`,
                      top: `${zoomStyle.y}%`,
                    }
                  ]}
                />
              )}

              {/* Mobile Zoom Hint (Text) */}
              {!IS_DESKTOP && (
                <View style={styles.zoomHint}>
                  <Text style={styles.zoomHintText}>Touch to Zoom</Text>
                </View>
              )}
            </View>

            {/* Thumbnails */}
            {images.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailList}>
                {images.map((img, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setActiveImage(index)}
                    style={[
                      styles.thumbnailItem,
                      activeImage === index && styles.thumbnailActive
                    ]}
                  >
                    <Image source={{ uri: img }} style={styles.thumbnailImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* RIGHT COLUMN: DETAILS */}
          <View style={[styles.detailsSection, IS_DESKTOP && styles.desktopDetailsSection]}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandText}>BREWSTER HOME FASHIONS</Text>
            </View>

            <Text style={styles.title}>{wallpaper.name}</Text>

            <View style={styles.skuContainer}>
              <Text style={styles.skuLabel}>Item #</Text>
              <Text style={styles.skuValue}>{wallpaper.publicSku || 'VIZ-GEN'}</Text>
            </View>

            <Text style={styles.price}>${wallpaper.price.toFixed(2)} / roll</Text>

            {/* Variants (Other Colors) */}
            {variants.length > 0 && (
              <View style={styles.variantsContainer}>
                <Text style={styles.variantTitle}>OTHER COLORS:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantList}>
                  {variants.map(variant => (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.variantItem,
                        variant.id === wallpaper.id && styles.variantSelected
                      ]}
                      onPress={() => {
                        if (variant.id !== wallpaper.id) {
                          router.push(`/wallpaper/${variant.id}`);
                        }
                      }}
                    >
                      <Image source={{ uri: variant.imageUrl }} style={styles.variantImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Visualizer Button */}
            <TouchableOpacity
              style={styles.visualizerButton}
              onPress={() => router.push({
                pathname: '/(tabs)/camera',
                params: { wallpaperId: wallpaper.id }
              })}
            >
              <Camera size={20} color={Colors.light.primary} />
              <Text style={styles.visualizerButtonText}>TRY IN MY ROOM</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.sectionHeader}>Description</Text>
            <Text style={styles.description}>
              {wallpaper.description || "Un diseño exclusivo que transforma cualquier espacio. Fabricado con materiales de alta calidad para asegurar durabilidad y un acabado premium."}
            </Text>

            {/* Calculator Teaser */}
            <TouchableOpacity style={styles.calculatorRow} onPress={() => setShowCalculator(true)}>
              <Info size={20} color={Colors.light.accent} />
              <View>
                <Text style={styles.calculatorText}>How much do I need?</Text>
                <Text style={styles.calculatorSubtext}>Calculate rolls inclusive of pattern repeat</Text>
              </View>
            </TouchableOpacity>

            {/* Pattern Info Display */}
            <View style={styles.specsContainer}>
              <View style={styles.specItem}>
                <Ruler size={20} color={Colors.light.textSecondary} />
                <View>
                  <Text style={styles.specLabel}>Pattern Repeat</Text>
                  <Text style={styles.specValue}>
                    {wallpaper.patternRepeat ? `${wallpaper.patternRepeat} in` : 'None'}
                  </Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <Layers size={20} color={Colors.light.textSecondary} />
                <View>
                  <Text style={styles.specLabel}>Match</Text>
                  <Text style={styles.specValue}>{wallpaper.patternMatch || 'Random'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.specsContainer}>
              <View style={styles.specItem}>
                <Ruler size={20} color={Colors.light.textSecondary} />
                <View>
                  <Text style={styles.specLabel}>Dimensions</Text>
                  <Text style={styles.specValue}>
                    {wallpaper.dimensions
                      ? formatDimensionsImperial(wallpaper.dimensions.width, wallpaper.dimensions.height)
                      : '21 in x 33 ft'}
                  </Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <ShieldCheck size={20} color={Colors.light.textSecondary} />
                <View>
                  <Text style={styles.specLabel}>Quality</Text>
                  <Text style={styles.specValue}>Premium Washable</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.actionContainer}>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={styles.qtyBtn}
                >
                  <Minus size={18} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(quantity + 1)}
                  style={styles.qtyBtn}
                >
                  <Plus size={18} color={Colors.light.text} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.addToCartBtn}
                onPress={() => addToCart(wallpaper, quantity)}
              >
                <Text style={styles.addToCartText}>ADD TO CART</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sampleBtn}
                onPress={() => addToCart(wallpaper, 1, 0, 'sample')}
              >
                <Text style={styles.sampleBtnText}>ORDER SAMPLE ($5.00)</Text>
              </TouchableOpacity>
            </View>

            {/* CALCULATOR MODAL */}
            <Modal
              visible={showCalculator}
              transparent
              animationType="slide"
              onRequestClose={() => setShowCalculator(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Roll Calculator</Text>
                    <TouchableOpacity onPress={() => setShowCalculator(false)}>
                      <X color="#000" size={24} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalDesc}>
                    Enter your wall dimensions. We account for pattern repeat ({wallpaper.patternRepeat || 0}") and basic trim waste.
                  </Text>

                  <View style={styles.inputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Height (feet)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={calcHeight}
                        onChangeText={setCalcHeight}
                        placeholder="e.g. 9"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Width (feet)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={calcWidth}
                        onChangeText={setCalcWidth}
                        placeholder="e.g. 12"
                      />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.calcBtn} onPress={calculateRolls}>
                    <Text style={styles.calcBtnText}>Calculate</Text>
                  </TouchableOpacity>

                  {calculatedRolls > 0 && (
                    <View style={styles.resultContainer}>
                      <Text style={styles.resultText}>You need approximately:</Text>
                      <Text style={styles.resultValue}>{calculatedRolls} Rolls</Text>
                      <TouchableOpacity
                        style={styles.useResultBtn}
                        onPress={() => {
                          setQuantity(calculatedRolls);
                          setShowCalculator(false);
                        }}
                      >
                        <Text style={styles.useResultText}>Update Cart Quantity</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </Modal>




          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center'
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1, borderColor: '#eee'
  },
  iconButton: {
    padding: 8,
  },
  brandLogo: {
    fontFamily: 'Lato_700Bold',
    fontSize: 20,
    letterSpacing: 2,
    color: Colors.light.primary,
    fontWeight: 'bold',
  },
  calculatorSubtext: { fontSize: 10, color: '#666' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 20,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalDesc: { fontSize: 14, color: '#666', marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 16 },
  calcBtn: { backgroundColor: Colors.light.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  calcBtnText: { color: '#FFF', fontWeight: 'bold' },
  resultContainer: { marginTop: 20, padding: 15, backgroundColor: '#F0F9FF', borderRadius: 8, alignItems: 'center' },
  resultText: { fontSize: 14, color: '#000' },
  resultValue: { fontSize: 24, fontWeight: 'bold', color: Colors.light.primary, marginVertical: 5 },
  useResultBtn: { marginTop: 10 },
  useResultText: { color: Colors.light.primary, fontWeight: '600', textDecorationLine: 'underline' }

  contentWrapper: {
    flexDirection: 'column',
  },
  desktopLayout: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    paddingTop: 20,
    maxWidth: 1400,
    alignSelf: 'center',
    gap: 60,
  },

  // Images
  imageSection: {
    width: '100%',
  },
  desktopImageSection: {
    width: '55%',
  },
  mainImageWrapper: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  magnifier: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    pointerEvents: 'none',
    transform: [{ translateX: -100 }, { translateY: -100 }], // Center on cursor
    backgroundColor: 'white',
    // Background image props set inline
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  zoomHintText: { color: 'white', fontSize: 12 },

  thumbnailList: {
    marginTop: 16,
    paddingHorizontal: IS_DESKTOP ? 0 : 20,
    maxHeight: 90
  },
  thumbnailItem: {
    width: 80, height: 80,
    marginRight: 10,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  thumbnailImage: { width: '100%', height: '100%' },

  // Details
  detailsSection: {
    padding: 24,
  },
  desktopDetailsSection: {
    width: '45%',
    paddingTop: 0,
  },
  brandBadge: {
    marginBottom: 10,
  },
  brandText: {
    fontSize: 12,
    fontFamily: 'Lato_700Bold',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.light.text,
    marginBottom: 8,
    lineHeight: 40,
  },
  skuContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 5,
  },
  skuLabel: { fontSize: 14, color: Colors.light.textSecondary },
  skuValue: { fontSize: 14, color: Colors.light.textSecondary, fontWeight: 'bold' },

  price: {
    fontSize: 28,
    fontFamily: 'Lato_700Bold',
    color: Colors.light.primary,
    marginBottom: 24,
  },

  sectionTitle: { fontSize: 18, fontFamily: 'PlayfairDisplay_600SemiBold', marginBottom: 15, color: '#111' },

  // Variants
  variantsContainer: { marginBottom: 20 },
  variantTitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 10, textTransform: 'uppercase' },
  variantList: { flexDirection: 'row', gap: 10 },
  variantItem: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden', marginRight: 10 },
  variantSelected: { borderWidth: 2, borderColor: Colors.light.primary },
  variantImage: { width: '100%', height: '100%' },

  visualizerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    marginBottom: 20,
  },
  visualizerButtonText: {
    color: Colors.light.primary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },

  addToCartContainer: { gap: 15 },

  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: 24 },

  sectionHeader: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    fontFamily: 'Lato_400Regular',
  },

  specsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  specItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  specLabel: { fontSize: 12, color: Colors.light.textSecondary, textTransform: 'uppercase' },
  specValue: { fontSize: 16, fontWeight: '600', color: Colors.light.text },

  calculatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
  },
  calculatorText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },

  // Actions
  actionContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    height: 50,
  },
  qtyBtn: {
    width: 40, height: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyText: {
    width: 30, textAlign: 'center',
    fontSize: 16, fontWeight: 'bold',
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addToCartText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sampleBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
    marginTop: 10,
  },
  sampleBtnText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  shippingText: {
    fontSize: 12,
    color: Colors.light.success,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});