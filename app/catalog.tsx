import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, Filter, X, Check, Search, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { WallpaperCard } from '@/components/WallpaperCard';
import { getBaseName } from '@/utils/product';
import { SeoHead } from '@/components/SeoHead';
import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ style?: string; category?: string; search?: string }>();
  const wallpapers = useWallpapersStore((s) => s.wallpapers);

  // Local State
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeColors, setActiveColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync params
  useEffect(() => {
    if (params.style) {
      setActiveStyle(params.style);
      setActiveCategory(null);
      setActiveColors([]);
    } else if (params.category) {
      setActiveCategory(params.category);
      setActiveStyle(null);
      setActiveColors([]);
    }
  }, [params.style, params.category]);

  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search);
    }
  }, [params.search]);

  // Derived Data
  const availableStyles = useMemo(() => {
    const styles = new Set<string>();
    wallpapers.forEach(w => { if (w.style) styles.add(w.style.trim()); });
    return Array.from(styles).sort();
  }, [wallpapers]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    wallpapers.forEach(w => {
      if (w.colors && Array.isArray(w.colors)) {
        w.colors.forEach(c => colors.add(c.trim()));
      }
    });
    return Array.from(colors).sort();
  }, [wallpapers]);

  const numColumns = useMemo(() => (SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2), []);

  const filteredWallpapers = useMemo(() => {
    const filtered = wallpapers.filter(w => {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      if (activeStyle && (!w.style || !normalize(w.style).includes(normalize(activeStyle)))) return false;
      if (activeCategory && (!w.category || !normalize(w.category).includes(normalize(activeCategory)))) return false;

      if (activeColors.length > 0) {
        const wColors = w.colors || [];
        const hasColor = activeColors.some(c => wColors.some(wc => wc.toLowerCase().includes(c.toLowerCase())));
        if (!hasColor) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchId = w.id.toLowerCase().includes(q);
        const matchSku = w.publicSku?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchSku) return false;
      }

      return true;
    });

    // Deduplicate variants
    const uniqueMap = new Map();
    filtered.forEach(w => {
      const baseName = getBaseName(w.name);
      if (!uniqueMap.has(baseName)) uniqueMap.set(baseName, w);
    });

    return Array.from(uniqueMap.values());
  }, [wallpapers, activeStyle, activeCategory, activeColors, searchQuery]);

  const toggleColor = (color: string) => {
    setActiveColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };

  const clearFilters = () => {
    setActiveStyle(null);
    setActiveCategory(null);
    setActiveColors([]);
    setSearchQuery('');
    router.setParams({ style: undefined, category: undefined, search: undefined });
  };

  return (
    <View style={styles.container}>
      <SeoHead title="Shop Wallpaper | Vizzaro" description="Browse our premium wallpaper collection." />
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.white} />

      <AnnouncementBar />
      <Header />

      {/* SUB-HEADER COMPACT */}
      <View style={styles.subHeader}>
        <View style={styles.searchBar}>
          <Search size={16} color={Theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Theme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterTrigger} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterTriggerText}>FILTER</Text>
          <ChevronDown size={14} color={Theme.colors.black} />
          {(activeStyle || activeCategory || activeColors.length > 0) && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* ACTIVE FILTERS CHIPS */}
      {(activeCategory || activeStyle || activeColors.length > 0) && (
        <View style={styles.activeFiltersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
            {activeCategory && (
              <TouchableOpacity style={styles.chip} onPress={() => setActiveCategory(null)}>
                <Text style={styles.chipText}>{activeCategory}</Text>
                <X size={12} color={Theme.colors.white} />
              </TouchableOpacity>
            )}
            {activeStyle && (
              <TouchableOpacity style={styles.chip} onPress={() => setActiveStyle(null)}>
                <Text style={styles.chipText}>{activeStyle}</Text>
                <X size={12} color={Theme.colors.white} />
              </TouchableOpacity>
            )}
            {activeColors.map(c => (
              <TouchableOpacity key={c} style={styles.chip} onPress={() => toggleColor(c)}>
                <Text style={styles.chipText}>{c}</Text>
                <X size={12} color={Theme.colors.white} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* GRID */}
      <FlatList
        data={filteredWallpapers}
        key={numColumns}
        numColumns={numColumns}
        style={{ flex: 1 }}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        initialNumToRender={8}
        renderItem={({ item }) => (
          <View style={{ flex: 1, padding: 6, maxWidth: `${100 / numColumns}%` }}>
            <WallpaperCard item={item} onPress={(w) => router.push(`/wallpaper/${w.id}` as any)} width="100%" />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No results found.</Text>
            <TouchableOpacity onPress={clearFilters}><Text style={styles.emptyLink}>Clear Filters</Text></TouchableOpacity>
          </View>
        }
      />

      {/* FILTERS MODAL */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>FILTERS</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color={Theme.colors.black} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>STYLE</Text>
              <View style={styles.tagsContainer}>
                {availableStyles.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.tag, activeStyle === s && styles.tagActive]}
                    onPress={() => setActiveStyle(activeStyle === s ? null : s)}
                  >
                    <Text style={[styles.tagText, activeStyle === s && styles.tagTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>COLOR</Text>
              <View style={styles.tagsContainer}>
                {availableColors.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.tag, activeColors.includes(c) && styles.tagActive]}
                    onPress={() => toggleColor(c)}
                  >
                    <Text style={[styles.tagText, activeColors.includes(c) && styles.tagTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyBtnText}>VIEW {filteredWallpapers.length} RESULTS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.white },

  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    gap: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 4, // Slightly rounded
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Theme.typography.fontFamily.sans,
    fontSize: 13,
    padding: 0,
    height: '100%',
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  filterTriggerText: {
    fontFamily: Theme.typography.fontFamily.sansBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  activeDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.colors.black,
  },

  activeFiltersRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.black,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6,
  },
  chipText: { color: Theme.colors.white, fontSize: 10, fontFamily: Theme.typography.fontFamily.sansBold },
  clearText: { color: Theme.colors.textSecondary, fontSize: 11, paddingHorizontal: 8, textDecorationLine: 'underline' },

  gridContent: { paddingVertical: 20, paddingHorizontal: 14 },
  gridRow: { gap: 0 },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: Theme.typography.fontFamily.serif, fontSize: 18, marginBottom: 12 },
  emptyLink: { color: Theme.colors.black, textDecorationLine: 'underline' },

  // Modal
  modalBody: { flex: 1, backgroundColor: Theme.colors.white, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  modalTitle: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 18, letterSpacing: 1 },
  modalScroll: { padding: 20 },

  filterSection: { marginBottom: 32 },
  filterLabel: { fontFamily: Theme.typography.fontFamily.sansBold, fontSize: 12, marginBottom: 16, letterSpacing: 1 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Theme.colors.border },
  tagActive: { borderColor: Theme.colors.black, backgroundColor: Theme.colors.black },
  tagText: { fontFamily: Theme.typography.fontFamily.sans, fontSize: 13 },
  tagTextActive: { color: Theme.colors.white },

  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingBottom: 40 },
  applyBtn: { backgroundColor: Theme.colors.black, paddingVertical: 16, alignItems: 'center' },
  applyBtnText: { color: Theme.colors.white, fontFamily: Theme.typography.fontFamily.sansBold, letterSpacing: 1 },
});
