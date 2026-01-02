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
  Alert
} from 'react-native';
import { ShoppingBag, Search, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useHistory } from '@/contexts/HistoryContext';
import { router } from 'expo-router';
import { WallpaperCard } from '@/components/WallpaperCard';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { getBaseName } from '@/utils/product';
import { wallpapers as defaultWallpapers } from '@/constants/wallpapers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { wallpapers, refetchWallpapers } = useWallpapers();
  const { recentItems } = useHistory();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  let [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Lato_400Regular,
    Lato_700Bold,
  });

  const numColumns = useMemo(() => (width >= 1200 ? 5 : width >= 768 ? 3 : 2), [width]);

  // Take first 12 items for "New Arrivals", deduplicating variants (same name diff color)
  const featuredWallpapers = useMemo(() => {
    const visible = wallpapers.filter(w => w.showInHome);
    const uniqueMap = new Map();

    visible.forEach(w => {
      // Use shared utility for robust grouping
      const baseName = getBaseName(w.name);
      if (!uniqueMap.has(baseName)) {
        uniqueMap.set(baseName, w);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 12);
  }, [wallpapers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchWallpapers();
    setRefreshing(false);
  };

  const handleMenuPress = () => {
    router.push('/(tabs)/profile');
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* PROFESSIONAL HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleMenuPress} style={styles.iconBtn}>
          <Menu color="#000" size={24} />
        </TouchableOpacity>

        <Text style={styles.brandTitle}>VIZZARO</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/catalog')}><Search color="#000" size={24} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/cart')}><ShoppingBag color="#000" size={24} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.light.accent} />}
      >

        {/* CAROUSEL HERO */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1542887800-faca026197e3?q=80&w=1200' }}
            style={[styles.heroSlide, { width: SCREEN_WIDTH }]}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>Vizzaro Custom Wallpaper</Text>
              <Text style={styles.heroSubtitle}>Transform your space with exclusive designs.</Text>
              <TouchableOpacity style={styles.heroButton} onPress={() => router.push('/catalog')}>
                <Text style={styles.heroButtonText}>SHOP NOW</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>

          {/* Slide 2 */}
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200' }}
            style={[styles.heroSlide, { width: SCREEN_WIDTH }]}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>New Tropical Collection</Text>
              <Text style={styles.heroSubtitle}>Bring nature indoors.</Text>
              <TouchableOpacity style={styles.heroButton} onPress={() => router.push({ pathname: '/catalog', params: { category: 'Floral' } })}>
                <Text style={styles.heroButtonText}>EXPLORE</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </ScrollView>

        {/* FEATURED COLLECTIONS (Features) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Collections</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionList}>
            {['Floral', 'Geométrico', 'Textura', 'Lujo'].map((cat, i) => (
              <TouchableOpacity
                key={i}
                style={styles.collectionCard}
                onPress={() => {
                  if (cat === 'Lujo') {
                    router.push({ pathname: '/catalog', params: { style: 'Luxury' } });
                  } else {
                    router.push({ pathname: '/catalog', params: { category: cat } });
                  }
                }}
              >
                <Image
                  // Use CONSTANT data for these images to ensure they never fail even if API/Context is loading or empty
                  source={{ uri: defaultWallpapers.find(w => w.category === cat || (cat === 'Lujo' && w.style === 'Luxury'))?.imageUrl || 'https://via.placeholder.com/300' }}
                  style={styles.collectionImage}
                />
                <Text style={styles.collectionTitle}>{cat}</Text>
                <Text style={styles.collectionSubtitle}>VER COLECCIÓN</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* LATEST ARRIVALS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Arrivals</Text>
            <TouchableOpacity onPress={() => router.push('/catalog')}>
              <Text style={styles.seeAll}>Shop All</Text>
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
              <View style={{ flex: 1, paddingHorizontal: 4, maxWidth: `${100 / numColumns}%` }}>
                <WallpaperCard item={item} onPress={(w) => router.push(`/wallpaper/${w.id}`)} width="100%" />
              </View>
            )}
          />
        </View>

        {/* RECENTLY VIEWED (Cookies) */}
        {recentItems.length > 0 && (
          <View style={[styles.section, styles.historySection]}>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyList}>
              {recentItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyItem}
                  onPress={() => router.push(`/wallpaper/${item.id}`)}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.historyImage} />
                  <Text style={styles.historyName} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Vizzaro Wallcoverings. All rights reserved.</Text>
          <Text style={styles.footerLink}>Privacy Policy • Terms of Service</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
  },
  brandTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, letterSpacing: 2, color: '#000' },
  headerIcons: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 4 },

  container: { flex: 1 },

  carousel: { height: 500 },
  heroSlide: { height: 500, justifyContent: 'center', alignItems: 'center' },
  heroOverlay: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center' },
  heroTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 42, color: '#FFF', textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  heroSubtitle: { fontFamily: 'Lato_400Regular', fontSize: 18, color: '#F0F0F0', textAlign: 'center', marginBottom: 25 },
  heroButton: { borderWidth: 2, borderColor: '#FFF', paddingHorizontal: 30, paddingVertical: 12 },
  heroButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },

  section: { paddingVertical: 40, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  sectionTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 28, color: '#111', marginBottom: 20, textAlign: 'center' },
  seeAll: { fontFamily: 'Lato_700Bold', fontSize: 14, color: Colors.light.primary, textDecorationLine: 'underline' },

  collectionList: { gap: 20, paddingHorizontal: 10 },
  collectionCard: { alignItems: 'center', marginRight: 20 },
  collectionImage: { width: 250, height: 350, marginBottom: 15 },
  collectionTitle: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 22, color: '#111', marginBottom: 5 },
  collectionSubtitle: { fontFamily: 'Lato_700Bold', fontSize: 12, color: '#666', letterSpacing: 1 },

  gridContainer: {},
  gridRow: { gap: 0, justifyContent: 'flex-start' },

  historySection: { backgroundColor: '#F9F9F9' },
  historyList: { gap: 15 },
  historyItem: { width: 120, marginRight: 15 },
  historyImage: { width: 120, height: 120, borderRadius: 4, marginBottom: 8 },
  historyName: { fontSize: 12, fontFamily: 'Lato_400Regular', color: '#333' },

  footer: { padding: 40, backgroundColor: '#111', alignItems: 'center' },
  footerText: { color: '#888', fontSize: 12, marginBottom: 10 },
  footerLink: { color: '#666', fontSize: 12 }
});
