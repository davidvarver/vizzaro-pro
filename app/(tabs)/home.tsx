import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  FlatList,
  RefreshControl,
  useWindowDimensions,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Theme } from '@/constants/theme';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { router } from 'expo-router';
import { WallpaperCard } from '@/components/WallpaperCard';
import { getBaseName } from '@/utils/product';
import { wallpapers as defaultWallpapers } from '@/constants/wallpapers';
import { SeoHead } from '@/components/SeoHead';
import { useCollectionsStore } from '@/store/useCollectionsStore';
import Header from '@/components/Header';
import AnnouncementBar from '@/components/AnnouncementBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const wallpapers = useWallpapersStore((s) => s.wallpapers);
  const refetchWallpapers = useWallpapersStore((s) => s.refetchWallpapers);
  const recentItems = useHistoryStore((s) => s.recentItems);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const numColumns = useMemo(() => (width >= 1200 ? 5 : width >= 768 ? 3 : 2), [width]);

  // Featured Logic
  const featuredWallpapers = useMemo(() => {
    const visible = wallpapers.filter(w => w.showInHome);
    const uniqueMap = new Map();
    visible.forEach(w => {
      const baseName = getBaseName(w.name);
      if (!uniqueMap.has(baseName)) uniqueMap.set(baseName, w);
    });
    return Array.from(uniqueMap.values()).slice(0, 8); // Minimal list
  }, [wallpapers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchWallpapers();
    setRefreshing(false);
  };

  return (
    <View style={styles.mainContainer}>
      <SeoHead
        title="Vizzaro | Luxury Wallcoverings"
        description="Premium wallpaper designs for sophisticated interiors."
      />
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.white} />

      <AnnouncementBar />
      <Header />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Theme.colors.black} />}
      >
        {/* YORK-STYLE HERO SECTION */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1542887800-faca026197e3?q=80&w=1200' }}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <View style={styles.heroOverlay}>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>ARTISTRY ON YOUR WALLS</Text>
                <Text style={styles.heroSubtitle}>Discover our new collection of premium patterns.</Text>
                <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/catalog' as any)}>
                  <Text style={styles.heroButtonText}>SHOP NOW</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* SHOP BY CATEGORY (Grid 2x2 or 3x1) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Shop by Category</Text>
          <View style={styles.categoryGrid}>
            {['Floral', 'Geometric', 'Textural', 'Scenic'].map((cat, i) => {
              // Find first image for this category
              const img = wallpapers.find(w => w.category === cat || (cat === 'Textural' && w.category === 'Textura'))?.imageUrl
                || 'https://via.placeholder.com/400';
              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryCard}
                  onPress={() => router.push({ pathname: '/catalog', params: { category: cat === 'Textural' ? 'Textura' : cat } } as any)}
                >
                  <Image source={{ uri: img }} style={styles.categoryImage} />
                  <View style={styles.categoryLabelContainer}>
                    <Text style={styles.categoryLabel}>{cat.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SHOP BY COLOR STRIP */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Shop by Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorStrip}>
            {[
              { name: 'Neutral', color: '#E5E0D8' },
              { name: 'Blue', color: '#8FA3AD' },
              { name: 'Green', color: '#8FAD95' },
              { name: 'Black', color: '#2C2C2C' },
              { name: 'Pink', color: '#EACCCC' },
              { name: 'Gold', color: '#D4AF37' },
            ].map((c) => (
              <TouchableOpacity key={c.name} style={styles.colorSwatch} onPress={() => router.push({ pathname: '/catalog', params: { color: c.name } } as any)}>
                <View style={[styles.colorCircle, { backgroundColor: c.color }]} />
                <Text style={styles.colorName}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* LATEST ARRIVALS */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>New Arrivals</Text>
            <TouchableOpacity onPress={() => router.push('/catalog' as any)}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={featuredWallpapers}
            numColumns={numColumns}
            key={numColumns}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <View style={{ flex: 1, paddingHorizontal: 6, maxWidth: `${100 / numColumns}%` }}>
                <WallpaperCard item={item} onPress={(w) => router.push(`/wallpaper/${w.id}` as any)} width="100%" />
              </View>
            )}
          />
        </View>

        {/* FOOTER SIMPLE */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 VIZZARO WALLCOVERINGS</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Theme.colors.white },
  container: { flex: 1 },

  // HERO
  heroContainer: {
    height: 550,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.15)', // Very subtle overlay
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: '80%',
  },
  heroTitle: {
    fontFamily: Theme.typography.fontFamily.serifBold,
    fontSize: 42,
    color: Theme.colors.white,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontFamily: Theme.typography.fontFamily.sans,
    fontSize: 16,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: 32,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 4,
  },
  heroButton: {
    backgroundColor: Theme.colors.white,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  heroButtonText: {
    fontFamily: Theme.typography.fontFamily.sansBold, // Bold for button
    fontSize: 13,
    color: Theme.colors.black,
    letterSpacing: 1.5,
  },

  // SECTIONS
  section: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontFamily: Theme.typography.fontFamily.serif,
    fontSize: 28,
    color: Theme.colors.black,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  linkText: {
    fontFamily: Theme.typography.fontFamily.sans,
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // CATEGORY GRID
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  categoryCard: {
    width: Platform.OS === 'web' && SCREEN_WIDTH > 768 ? '45%' : '47%',
    aspectRatio: 1, // Square for categories
    position: 'relative',
    marginBottom: 16,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryLabelContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  categoryLabel: {
    backgroundColor: Theme.colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontFamily: Theme.typography.fontFamily.sansMedium,
    fontSize: 12,
    letterSpacing: 1,
    color: Theme.colors.black,
    overflow: 'hidden',
  },

  // COLOR STRIP
  colorStrip: {
    paddingHorizontal: 10,
    gap: 24,
  },
  colorSwatch: {
    alignItems: 'center',
    marginRight: 8,
  },
  colorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30, // Circle
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  colorName: {
    fontFamily: Theme.typography.fontFamily.sans,
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },

  // LISTS
  gridContainer: {},
  gridRow: {
    gap: 0,
  },

  footer: {
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontFamily: Theme.typography.fontFamily.sans,
    fontSize: 10,
    color: Theme.colors.textSecondary,
    letterSpacing: 1,
  },
});
