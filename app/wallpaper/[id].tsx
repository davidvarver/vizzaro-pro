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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFavorites } from '@/contexts/FavoritesContext';
import {
  ArrowLeft,
  Share2,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  Ruler,
  Info,
  ShoppingCart,
  Heart,
  Camera,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useCart } from '@/contexts/CartContext';
import { useHistory } from '@/contexts/HistoryContext';
import { SeoHead } from '@/components/SeoHead';

import { getBaseName } from '@/utils/product';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 1024;

export default function WallpaperDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getWallpaperById, wallpapers } = useWallpapers(); // Get all wallpapers to find variants
  const { addToCart, cartItems } = useCart();
  const { addToHistory } = useHistory();
  const { favoriteProjects, addToFavorites, removeFromFavorites, addWallpaperToProject, removeWallpaperFromProject } = useFavorites();

  const wallpaper = getWallpaperById(id || '');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

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
              <Text style={styles.skuValue}>{wallpaper.publicSku || wallpaper.id}</Text>
            </View>

            <Text style={styles.price}>${wallpaper.price.toFixed(2)} / rollo</Text>

            {/* Variants (Other Colors) */}
            {variants.length > 0 && (
              <View style={styles.variantsContainer}>
                <Text style={styles.variantTitle}>Otros Colores:</Text>
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
              <Text style={styles.visualizerButtonText}>PROBAR EN MI PARED</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.sectionHeader}>Descripción</Text>
            <Text style={styles.description}>
              {wallpaper.description || "Un diseño exclusivo que transforma cualquier espacio. Fabricado con materiales de alta calidad para asegurar durabilidad y un acabado premium."}
            </Text>

            <View style={styles.specsContainer}>
              <View style={styles.specItem}>
                <Ruler size={20} color={Colors.light.textSecondary} />
                <View>
                  <Text style={styles.specLabel}>Dimensiones</Text>
                  <Text style={styles.specValue}>53cm x 10m</Text>
                </View>
              </View>
              <View style={styles.specItem}>
                <ShieldCheck size={20} color={Colors.light.textSecondary} />
                <View>
                  <Text style={styles.specLabel}>Calidad</Text>
                  <Text style={styles.specValue}>Lavable Premium</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Calculator Teaser */}
            <TouchableOpacity style={styles.calculatorRow}>
              <Info size={20} color={Colors.light.accent} />
              <Text style={styles.calculatorText}>¿Cuánto necesito? Calcular rollos</Text>
            </TouchableOpacity>

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
                <Text style={styles.addToCartText}>AGREGAR AL CARRITO</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.shippingInfo}>
              <Truck size={16} color={Colors.light.success} />
              <Text style={styles.shippingText}>Envío Gratis en pedidos mayores a $2000</Text>
            </View>

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
  },

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