import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useFavorites } from '@/contexts/FavoritesContext';
import { WallpaperCard } from '@/components/WallpaperCard';
import { useFonts, PlayfairDisplay_600SemiBold, PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favoriteProjects } = useFavorites();

  let [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_400Regular,
    Lato_400Regular,
    Lato_700Bold
  });

  const numColumns = useMemo(() => (SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2), []);

  const favoriteWallpapers = useMemo(() => {
    const uniqueMap = new Map();
    // Flatten all wallpapers from all projects
    favoriteProjects.forEach(p => {
      p.wallpapers.forEach(w => {
        if (!uniqueMap.has(w.id)) {
          uniqueMap.set(w.id, w);
        }
      });
    });
    return Array.from(uniqueMap.values());
  }, [favoriteProjects]);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <ArrowLeft color="#000" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Favoritos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* CONTENT */}
      <FlatList
        data={favoriteWallpapers}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <View style={{ flex: 1, padding: 8, maxWidth: `${100 / numColumns}%` }}>
            <WallpaperCard
              item={item}
              onPress={() => router.push(`/wallpaper/${item.id}`)}
              width="100%"
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Heart size={80} color={Colors.light.backgroundSecondary} fill={Colors.light.backgroundSecondary} />
            <Text style={styles.emptyTitle}>Tu lista de deseos está vacía</Text>
            <Text style={styles.emptySubtitle}>Guarda tus diseños favoritos tocando el corazón.</Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={styles.browseBtnText}>EXPLORAR COLECCIÓN</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    color: '#000',
    letterSpacing: 1
  },
  iconBtn: { padding: 8 },

  listContent: { padding: 10, flexGrow: 1 },
  gridRow: { gap: 0 },

  emptyState: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 24,
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontFamily: 'Lato_400Regular',
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24
  },
  browseBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 4,
  },
  browseBtnText: {
    color: '#FFF',
    fontFamily: 'Lato_700Bold',
    fontSize: 14,
    letterSpacing: 2
  }
});