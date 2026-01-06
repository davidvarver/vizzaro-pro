import React, { useState, useEffect } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Minus, Plus, Share2, Ruler, ShieldCheck } from 'lucide-react-native';

import { Theme } from '@/constants/theme';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useCartStore } from '@/store/useCartStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { SeoHead } from '@/components/SeoHead';
import { getBaseName, formatDimensionsImperial } from '@/utils/product';
import { calculateRollsNeeded } from '@/utils/calculator';

import Header from '@/components/Header';
import AnnouncementBar from '@/components/AnnouncementBar';
import { AccordionItem } from '@/components/AccordionItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 1024;

export default function WallpaperDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const getWallpaperById = useWallpapersStore((s) => s.getWallpaperById);
  const wallpapers = useWallpapersStore((s) => s.wallpapers);
  const addToCart = useCartStore((s) => s.addToCart);
  const addToHistory = useHistoryStore((s) => s.addToHistory);

  const wallpaper = getWallpaperById(id || '');

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcHeight, setCalcHeight] = useState('');
  const [calcWidth, setCalcWidth] = useState('');
  const [calculatedRolls, setCalculatedRolls] = useState(0);

  useEffect(() => {
    if (wallpaper) {
      addToHistory(wallpaper);
    }
  }, [wallpaper]);

  if (!wallpaper) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.white, justifyContent: 'center' }}>
        <ActivityIndicator color={Theme.colors.black} />
      </View>
    );
  }

  // Derived state
  const images = wallpaper.imageUrls && wallpaper.imageUrls.length > 0 ? wallpaper.imageUrls : [wallpaper.imageUrl];
  const variants = React.useMemo(() => {
    const currentBase = getBaseName(wallpaper.name);
    return wallpapers.filter(w => getBaseName(w.name) === currentBase);
  }, [wallpaper, wallpapers]);

  const calculateRolls = () => {
    if (!calcHeight || !calcWidth) return;
    const h = parseFloat(calcHeight);
    const w = parseFloat(calcWidth);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      setCalculatedRolls(0);
      return;
    }
    const repeatMeters = (wallpaper.patternRepeat || 0) * 0.0254;
    const { rollsNeeded } = calculateRollsNeeded(w, h, repeatMeters);
    setCalculatedRolls(rollsNeeded);
  };

  return (
    <View style={styles.mainContainer}>
      <SeoHead
        title={`${wallpaper.name} | Vizzaro`}
        description={`Buy ${wallpaper.name}. Premium wallpaper.`}
        image={images[0]}
      />

      <AnnouncementBar />
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BACK NAV (Mobile Only usually, but good for UX) */}
        {!IS_DESKTOP && (
          <TouchableOpacity onPress={() => router.back()} style={styles.mobileBackBtn}>
            <ArrowLeft color={Theme.colors.black} size={24} />
            <Text style={styles.backText}>Back to Catalog</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.contentWrapper, IS_DESKTOP && styles.desktopLayout]}>

          {/* --- LEFT: IMAGES --- */}
          <View style={[styles.imageSection, IS_DESKTOP && styles.desktopImageSection]}>
            <View style={styles.mainImageWrapper}>
              <Image source={{ uri: images[activeImage] }} style={styles.mainImage} resizeMode="cover" />
              {!wallpaper.inStock && (
                <View style={styles.outOfStockBadge}>
                  <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
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
                    style={[styles.thumbnailItem, activeImage === index && styles.thumbnailActive]}
                  >
                    <Image source={{ uri: img }} style={styles.thumbnailImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* --- RIGHT: DETAILS --- */}
          <View style={[styles.detailsSection, IS_DESKTOP && styles.desktopDetailsSection]}>
            <Text style={styles.brandText}>VIZZARO PREMIUM</Text>
            <Text style={styles.title}>{wallpaper.name}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.price}>${wallpaper.price.toFixed(2)}</Text>
              <Text style={styles.priceUnit}> / roll</Text>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* VARIANTS */}
            {variants.length > 0 && (
              <View style={styles.variantsContainer}>
                <Text style={styles.variantLabel}>Color: {variants.length} Available</Text>
                <View style={styles.variantGrid}>
                  {variants.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.variantDot, v.id === wallpaper.id && styles.variantDotActive]}
                      onPress={() => v.id !== wallpaper.id && router.push(`/wallpaper/${v.id}` as any)}
                    >
                      <Image source={{ uri: v.imageUrl }} style={styles.variantImg} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ACTION BUTTONS */}
            <View style={styles.actionsContainer}>
              {/* Quantity */}
              <View style={styles.qtyContainer}>
                <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
                  <Minus size={16} color={Theme.colors.black} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
                  <Plus size={16} color={Theme.colors.black} />
                </TouchableOpacity>
              </View>

              {/* Add to Cart */}
              <TouchableOpacity
                style={styles.addToCartBtn}
                onPress={() => addToCart(wallpaper, quantity)}
                disabled={!wallpaper.inStock}
              >
                <Text style={styles.addToCartText}>
                  {wallpaper.inStock ? 'ADD TO CART' : 'SOLD OUT'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Secondary Actions */}
            <View style={styles.secondaryActions}>
              <TouchableOpacity style={styles.sampleBtn} onPress={() => addToCart(wallpaper, 1, 0, 'sample')}>
                <Text style={styles.sampleBtnText}>ORDER SAMPLE ($5)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.visualizerLink}
                onPress={() => router.push({ pathname: '/(tabs)/camera', params: { wallpaperId: wallpaper.id } } as any)}
              >
                <Text style={styles.visualizerLinkText}>See in your room</Text>
              </TouchableOpacity>
            </View>

            {/* ACCORDIONS */}
            <View style={styles.accordions}>
              <AccordionItem title="DESCRIPTION" initialExpanded>
                <Text style={styles.bodyText}>
                  {wallpaper.description || "Transform your interior with this exquisite wallcovering. Featuring a premium finish and durable material, suitable for residential and light commercial use."}
                </Text>
              </AccordionItem>

              <AccordionItem title="SPECIFICATIONS">
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Dimensions:</Text>
                  <Text style={styles.specValue}>{wallpaper.dimensions ? formatDimensionsImperial(wallpaper.dimensions.width, wallpaper.dimensions.height) : '27 in x 27 ft'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Pattern Repeat:</Text>
                  <Text style={styles.specValue}>{wallpaper.patternRepeat ? `${wallpaper.patternRepeat}"` : 'None'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Match:</Text>
                  <Text style={styles.specValue}>{wallpaper.patternMatch || 'Straight'}</Text>
                </View>
              </AccordionItem>

              <AccordionItem title="ROLL CALCULATOR">
                <View style={styles.calculatorBox}>
                  <Text style={styles.calcDesc}>Enter wall size in feet:</Text>
                  <View style={styles.calcInputs}>
                    <TextInput
                      placeholder="Height (ft)"
                      style={styles.calcInput}
                      value={calcHeight}
                      onChangeText={setCalcHeight}
                      keyboardType="numeric"
                    />
                    <TextInput
                      placeholder="Width (ft)"
                      style={styles.calcInput}
                      value={calcWidth}
                      onChangeText={setCalcWidth}
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity style={styles.calcBtn} onPress={calculateRolls}>
                    <Text style={styles.calcBtnText}>CALCULATE</Text>
                  </TouchableOpacity>
                  {calculatedRolls > 0 && (
                    <Text style={styles.calcResult}>
                      estimated rolls needed: <Text style={{ fontWeight: 'bold' }}>{calculatedRolls}</Text>
                    </Text>
                  )}
                </View>
              </AccordionItem>
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Theme.colors.white },
  scrollContent: { paddingBottom: 60 },

  mobileBackBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8
  },
  backText: { fontFamily: Theme.typography.fontFamily.sans, fontSize: 14 },

  contentWrapper: { flexDirection: 'column' },
  desktopLayout: { flexDirection: 'row', paddingHorizontal: 60, paddingVertical: 40, maxWidth: 1400, alignSelf: 'center', gap: 80 },

  // Images
  imageSection: { width: '100%' },
  desktopImageSection: { width: '55%' },
  mainImageWrapper: { width: '100%', aspectRatio: 0.8, backgroundColor: '#f9f9f9', position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  outOfStockBadge: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 8 },
  outOfStockText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  thumbnailList: { marginTop: 16, paddingHorizontal: 20 },
  thumbnailItem: { width: 70, height: 70, marginRight: 12, borderWidth: 1, borderColor: 'transparent' },
  thumbnailActive: { borderColor: Theme.colors.black },
  thumbnailImage: { width: '100%', height: '100%' },

  // Details
  detailsSection: { padding: 24, paddingTop: 32 },
  desktopDetailsSection: { width: '45%', padding: 0 },

  brandText: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: Theme.colors.textSecondary, marginBottom: 12, fontFamily: Theme.typography.fontFamily.sansBold },
  title: { fontSize: 32, fontFamily: Theme.typography.fontFamily.serifBold, color: Theme.colors.black, marginBottom: 8, lineHeight: 38 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  price: { fontSize: 20, fontFamily: Theme.typography.fontFamily.sansMedium, color: Theme.colors.black },
  priceUnit: { fontSize: 14, color: Theme.colors.textSecondary },

  separator: { height: 1, backgroundColor: Theme.colors.border, marginBottom: 24 },

  // Variants
  variantsContainer: { marginBottom: 32 },
  variantLabel: { fontSize: 12, color: Theme.colors.textSecondary, marginBottom: 12 },
  variantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  variantDot: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: Theme.colors.border },
  variantDotActive: { borderColor: Theme.colors.black, borderWidth: 2 },
  variantImg: { width: '100%', height: '100%' },

  // Actions
  actionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, height: 48, borderRadius: 0 },
  qtyBtn: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center' },
  qtyText: { width: 30, textAlign: 'center', fontFamily: Theme.typography.fontFamily.sansBold },

  addToCartBtn: { flex: 1, backgroundColor: Theme.colors.black, height: 48, alignItems: 'center', justifyContent: 'center' },
  addToCartText: { color: Theme.colors.white, fontWeight: 'bold', letterSpacing: 1, fontSize: 13 },

  secondaryActions: { gap: 12, marginBottom: 40 },
  sampleBtn: { width: '100%', height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.black },
  sampleBtnText: { color: Theme.colors.black, fontSize: 13, letterSpacing: 1, fontWeight: '600' },

  visualizerLink: { alignItems: 'center', padding: 12 },
  visualizerLinkText: { textDecorationLine: 'underline', color: Theme.colors.textSecondary, fontSize: 13 },

  // Accordions Body
  accordions: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  bodyText: { fontSize: 14, lineHeight: 24, color: Theme.colors.textSecondary, fontFamily: Theme.typography.fontFamily.sans },
  specRow: { flexDirection: 'row', marginBottom: 8 },
  specLabel: { width: 120, fontSize: 14, color: Theme.colors.textSecondary },
  specValue: { fontSize: 14, color: Theme.colors.black, fontFamily: Theme.typography.fontFamily.sansMedium },

  // Mini Calculator
  calculatorBox: { paddingTop: 8 },
  calcDesc: { fontSize: 14, marginBottom: 12 },
  calcInputs: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  calcInput: { flex: 1, height: 40, borderWidth: 1, borderColor: Theme.colors.border, paddingHorizontal: 10 },
  calcBtn: { backgroundColor: Theme.colors.black, padding: 10, alignItems: 'center', marginBottom: 12 },
  calcBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  calcResult: { fontSize: 14, color: Theme.colors.success },
});