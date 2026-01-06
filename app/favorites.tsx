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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { WallpaperCard } from '@/components/WallpaperCard';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import { Heart } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const favoriteProjects = useFavoritesStore((s) => s.favoriteProjects);
  const numColumns = useMemo(() => (SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2), []);

  const favoriteWallpapers = useMemo(() => {
    if (!favoriteProjects) return [];
    const uniqueMap = new Map();
    favoriteProjects.forEach(p => {
      if (p.wallpapers) {
        p.wallpapers.forEach(w => {
          if (!uniqueMap.has(w.id)) uniqueMap.set(w.id, w);
        });
      }
    });
    return Array.from(uniqueMap.values());
  }, [favoriteProjects]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.white} />
      <AnnouncementBar />
      <Header />

      <View style={styles.subHeader}>
        <Text style={styles.headerTitle}>MY FAVORITES</Text>
        <Text style={styles.headerCount}>{favoriteWallpapers.length} ITEMS</Text>
      </View>

      <FlatList
        data={favoriteWallpapers}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <View style={{ flex: 1, padding: 6, maxWidth: `${100 / numColumns}%` }}>
            <WallpaperCard
              item={item}
              onPress={() => router.push(`/wallpaper/${item.id}` as any)}
              width="100%"
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Heart size={64} color={Theme.colors.border} strokeWidth={1} style={{ marginBottom: 20 }} />
            <Text style={styles.emptyTitle}>YOUR FAVORITES LIST IS EMPTY</Text>
            <Text style={styles.emptySubtitle}>Save items you love to revisit later.</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/catalog' as any)}>
              <Text style={styles.browseBtnText}>START SHOPPING</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.white },

  subHeader: {
    paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
    gap: 4
  },
  headerTitle: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 22, letterSpacing: 1 },
  headerCount: { fontFamily: Theme.typography.fontFamily.sans, fontSize: 12, color: Theme.colors.textSecondary },

  listContent: { paddingVertical: 20, paddingHorizontal: 14, flexGrow: 1 },
  gridRow: { gap: 0 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 18, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontFamily: Theme.typography.fontFamily.sans, fontSize: 14, color: Theme.colors.textSecondary, marginBottom: 32, textAlign: 'center' },
  browseBtn: { backgroundColor: Theme.colors.black, paddingVertical: 14, paddingHorizontal: 32 },
  browseBtnText: { color: Theme.colors.white, fontFamily: Theme.typography.fontFamily.sansBold, letterSpacing: 1, fontSize: 12 },
});