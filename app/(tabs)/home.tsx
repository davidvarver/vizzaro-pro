import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Search, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { router } from 'expo-router';
import { WallpaperCard } from '@/components/WallpaperCard';
import { Wallpaper } from '@/constants/wallpapers';


export default function HomeScreen() {
  // ... (imports and hooks)


  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { wallpapers, refetchWallpapers } = useWallpapers();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const numColumns = useMemo(() => {
    if (width >= 1200) return 4;
    if (width >= 768) return 3;
    return 2;
  }, [width]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/catalog',
        params: { search: searchQuery }
      });
    }
  };

  const handleWallpaperPress = (wallpaper: Wallpaper) => {
    router.push(`/wallpaper/${wallpaper.id}`);
  };

  const homeWallpapers = useMemo(() => {
    console.log('[Home] Total wallpapers:', wallpapers.length);
    console.log('[Home] All wallpapers with showInHome:', wallpapers.filter(w => w.showInHome).map(w => ({ id: w.id, name: w.name, showInHome: w.showInHome, inStock: w.inStock })));
    const featured = wallpapers.filter(w => w.showInHome && w.inStock).slice(0, 6);
    console.log('[Home] Home wallpapers (showInHome=true && inStock=true):', featured.length);
    return featured;
  }, [wallpapers]);

  const handleRefresh = async () => {
    console.log('[Home] Manual refresh triggered');
    setRefreshing(true);
    await refetchWallpapers();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.light.primary}
        />
      }
    >
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop&auto=format&q=80' }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/sre9ivu48wqqxw9hgy49l' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Tu espacio, tu estilo</Text>
          <Text style={styles.heroSubtitle}>
            Papel tapiz premium listo para instalar. Compra por habitación o explora nuestras colecciones
          </Text>

          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Busca: geométrico, beige, mármol..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.light.textSecondary}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Papel Tapiz Destacado</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshButton}
              disabled={refreshing}
            >
              <RefreshCw
                size={20}
                color={Colors.light.primary}
                style={refreshing ? styles.refreshIconSpinning : undefined}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/catalog')}>
              <Text style={styles.seeAll}>Ver todo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {homeWallpapers.length > 0 ? (
          <FlatList
            data={homeWallpapers}
            numColumns={numColumns}
            key={numColumns}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <WallpaperCard
                item={item}
                onPress={handleWallpaperPress}
                width={`${100 / numColumns - 2}%`}
              />
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay papel tapiz destacado.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Marca algunos productos como {`"`}Mostrar en home{`"`} desde el panel de administración.
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  hero: {
    width: '100%',
    minHeight: 500,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroImage: {
    opacity: 0.9,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 58, 29, 0.6)',
  },
  logo: {
    width: 280,
    height: 120,
    marginBottom: 20,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.light.background,
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 18,
    color: Colors.light.background,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
    maxWidth: 600,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
  },
  searchButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  searchButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingVertical: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  seeAll: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  refreshButton: {
    padding: 4,
  },
  refreshIconSpinning: {
    opacity: 0.5,
  },
  gridContainer: {
    paddingHorizontal: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.light.border,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridInfo: {
    padding: 12,
    gap: 4,
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    lineHeight: 18,
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  emptyState: {
    paddingHorizontal: 40,
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
