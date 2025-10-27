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
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { router } from 'expo-router';
import { Wallpaper } from '@/constants/wallpapers';

const rooms = [
  { id: 'sala', name: 'Sala', category: 'Todos' },
  { id: 'recamara', name: 'Recámara', category: 'Todos' },
  { id: 'infantil', name: 'Infantil', category: 'Todos' },
  { id: 'oficina', name: 'Oficina', category: 'Todos' },
  { id: 'cocina', name: 'Cocina', category: 'Todos' },
  { id: 'banno', name: 'Baño', category: 'Todos' },
];

const collections = [
  {
    id: 'blanco-negro',
    name: 'Blanco & Negro Moderno',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&h=600&fit=crop&auto=format&q=80',
    colors: ['Blanco', 'Negro', 'Gris'],
  },
  {
    id: 'textura-beige',
    name: 'Textura Beige Soft',
    image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&h=600&fit=crop&auto=format&q=80',
    colors: ['Beige', 'Crema'],
  },
  {
    id: 'geometria-gold',
    name: 'Geometría Gold Line',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&auto=format&q=80',
    colors: ['Dorado', 'Negro'],
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { wallpapers } = useWallpapers();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/catalog',
        params: { search: searchQuery }
      });
    }
  };

  const handleRoomPress = (room: typeof rooms[0]) => {
    router.push({
      pathname: '/catalog',
      params: { category: room.category }
    });
  };

  const handleCollectionPress = (collection: typeof collections[0]) => {
    router.push({
      pathname: '/catalog',
      params: { colors: collection.colors.join(',') }
    });
  };

  const handleWallpaperPress = (wallpaper: Wallpaper) => {
    router.push(`/wallpaper/${wallpaper.id}`);
  };

  const featuredWallpapers = useMemo(() => {
    return wallpapers.filter(w => w.inStock).slice(0, 6);
  }, [wallpapers]);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=800&fit=crop&auto=format&q=80' }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
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
          <Text style={styles.sectionTitle}>Explora por habitación</Text>
          <TouchableOpacity onPress={() => router.push('/catalog')}>
            <Text style={styles.seeAll}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roomsContainer}
        >
          {rooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.roomChip}
              onPress={() => handleRoomPress(room)}
            >
              <Text style={styles.roomChipText}>{room.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.collectionsGrid}>
          {collections.map((collection, index) => (
            <TouchableOpacity
              key={collection.id}
              style={[
                styles.collectionCard,
                index === 0 && styles.collectionCardLarge,
              ]}
              onPress={() => handleCollectionPress(collection)}
            >
              <ImageBackground
                source={{ uri: collection.image }}
                style={styles.collectionImage}
                imageStyle={styles.collectionImageStyle}
              >
                <View style={styles.collectionOverlay} />
                <View style={styles.collectionContent}>
                  <Text style={styles.collectionName}>{collection.name}</Text>
                  {index === 0 && (
                    <TouchableOpacity style={styles.collectionButton}>
                      <Text style={styles.collectionButtonText}>Ver colección</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ImageBackground>
              {index === 0 && (
                <View style={styles.patternPreview}>
                  <View style={styles.patternSquare} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Te puede gustar</Text>
          <TouchableOpacity onPress={() => router.push('/catalog')}>
            <Text style={styles.seeAll}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wallpapersContainer}
        >
          {featuredWallpapers.map((wallpaper) => (
            <TouchableOpacity
              key={wallpaper.id}
              style={styles.wallpaperCard}
              onPress={() => handleWallpaperPress(wallpaper)}
            >
              <Image 
                source={{ uri: wallpaper.imageUrls?.[0] || wallpaper.imageUrl }} 
                style={styles.wallpaperImage}
              />
              <View style={styles.patternPreviewSmall}>
                <View style={styles.patternSquareSmall} />
              </View>
              <View style={styles.wallpaperInfo}>
                <Text style={styles.wallpaperName} numberOfLines={1}>
                  {wallpaper.name}
                </Text>
                <Text style={styles.wallpaperPrice}>desde ${wallpaper.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  roomsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  roomChip: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 12,
  },
  roomChipText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  collectionsGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  collectionCard: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  collectionCardLarge: {
    height: 300,
  },
  collectionImage: {
    width: '100%',
    height: '100%',
  },
  collectionImageStyle: {
    borderRadius: 16,
  },
  collectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  collectionContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  collectionName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.background,
    marginBottom: 12,
  },
  collectionButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  collectionButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  patternPreview: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 60,
    height: 60,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 8,
  },
  patternSquare: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.textSecondary,
    borderRadius: 4,
  },
  wallpapersContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  wallpaperCard: {
    width: 160,
    marginRight: 16,
  },
  wallpaperImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
    marginBottom: 8,
  },
  patternPreviewSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
    padding: 6,
  },
  patternSquareSmall: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.textSecondary,
    borderRadius: 3,
  },
  wallpaperInfo: {
    gap: 4,
  },
  wallpaperName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  wallpaperPrice: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
