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
  TextInput
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, Filter, X, Check, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { WallpaperCard } from '@/components/WallpaperCard';
import { Wallpaper } from '@/constants/wallpapers';
import { useFonts, PlayfairDisplay_600SemiBold, PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { getBaseName } from '@/utils/product';
import { SeoHead } from '@/components/SeoHead';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ style?: string; category?: string; search?: string }>();
  const { wallpapers } = useWallpapers();

  // Local State
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeColors, setActiveColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Sync params with state on load
  // Sync params with state on load (and clear others to ensure results)
  useEffect(() => {
    if (params.style) {
      setActiveStyle(params.style);
      setActiveCategory(null); // Clear category if style is properly requested
      setActiveColors([]);
    } else if (params.category) {
      setActiveCategory(params.category);
      setActiveStyle(null); // Clear style if category is requested
      setActiveColors([]);
    }
  }, [params.style, params.category]);

  // Load Fonts
  let [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_400Regular,
    Lato_400Regular,
    Lato_700Bold
  });

  // Dynamic Filters derived from actual data
  const availableStyles = useMemo(() => {
    const styles = new Set<string>();
    wallpapers.forEach(w => {
      if (w.style) styles.add(w.style.trim());
    });
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
    // 1. Filter first
    const filtered = wallpapers.filter(w => {
      // Helper to normalize strings (remove accents, lowercase)
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      // Filter by Style
      if (activeStyle) {
        if (!w.style || !normalize(w.style).includes(normalize(activeStyle))) return false;
      }

      // Filter by Category
      if (activeCategory) {
        if (!w.category || !normalize(w.category).includes(normalize(activeCategory))) return false;
      }

      // Filter by Color
      if (activeColors.length > 0) {
        const wColors = w.colors || [];
        const hasColor = activeColors.some(c =>
          wColors.some(wc => wc.toLowerCase().includes(c.toLowerCase()))
        );
        if (!hasColor) return false;
      }

      // Filter by Search (Name or SKU)
      if (params.search) {
        const search = params.search.toLowerCase();
        const matchName = w.name.toLowerCase().includes(search);
        const matchId = w.id.toLowerCase().includes(search);
        const matchSku = w.publicSku?.toLowerCase().includes(search);

        if (!matchName && !matchId && !matchSku) {
          return false;
        }
      }

      return true;
    });

    // Deduplicate Variants
    const uniqueMap = new Map();
    filtered.forEach(w => {
      const baseName = getBaseName(w.name);
      if (!uniqueMap.has(baseName)) {
        uniqueMap.set(baseName, w);
      }
    });

    return Array.from(uniqueMap.values());
  }, [wallpapers, activeStyle, activeCategory, activeColors, params.search]);

  const toggleColor = (color: string) => {
    setActiveColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setActiveStyle(null);
    setActiveCategory(null);
    setActiveColors([]);
    router.setParams({ style: undefined, category: undefined });
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;



  //... (before return)

  return (
    <View style={styles.container}>
      <SeoHead
        title="Catálogo Completo - Papel Tapiz y Murales"
        description="Explora nuestra colección completa de papel tapiz. Filtra por color, estilo y diseño. Encuentra el estilo perfecto para tu hogar u oficina."
      />
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')}
            style={styles.backBtn}
          >
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>

          {/* SEARCH INPUT */}
          <View style={styles.searchContainer}>
            <Search color="#666" size={20} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o SKU..."
              value={params.search as string} // Just display param or local state? Better local state synced with URL?
              // Actually, let's use a local state for input to avoid jumpy URL updates
              onChangeText={(text) => router.setParams({ search: text })}
            // Note: Updating params on every keystroke might be slow. Debounce is better but keep it simple for now.
            />
            {params.search ? (
              <TouchableOpacity onPress={() => router.setParams({ search: '' })}>
                <X color="#666" size={18} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
            <Filter color="#000" size={24} />
          </TouchableOpacity>
        </View>

        {/* ACTIVE FILTERS BAR */}
        <View style={styles.activeFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterGap}>
            {activeCategory && (
              <TouchableOpacity style={styles.chip} onPress={() => setActiveCategory(null)}>
                <Text style={styles.chipText}>{activeCategory}</Text>
                <X size={14} color="#FFF" />
              </TouchableOpacity>
            )}
            {activeStyle && (
              <TouchableOpacity style={styles.chip} onPress={() => setActiveStyle(null)}>
                <Text style={styles.chipText}>{activeStyle}</Text>
                <X size={14} color="#FFF" />
              </TouchableOpacity>
            )}
            {activeColors.map(c => (
              <TouchableOpacity key={c} style={styles.chip} onPress={() => toggleColor(c)}>
                <View style={[styles.colorDot, { backgroundColor: getColorHex(c) }]} />
                <Text style={styles.chipText}>{c}</Text>
                <X size={14} color="#FFF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* GRID */}
      <FlatList
        data={filteredWallpapers}
        key={numColumns} // Force refresh on layout change
        numColumns={numColumns}
        contentContainerStyle={styles.gridContent}
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
            <Text style={styles.emptyText}>No se encontraron resultados.</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.emptyAction}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FILTER MODAL */}
      <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X color="#000" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>

            {/* CATEGORY (New Section if needed) */}

            {/* STYLES */}
            {availableStyles.length > 0 && (
              <>
                <Text style={styles.filterSectionTitle}>Estilo</Text>
                <View style={styles.filterWrap}>
                  {availableStyles.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterOption, activeStyle === s && styles.filterOptionActive]}
                      onPress={() => setActiveStyle(s === activeStyle ? null : s)}
                    >
                      <Text style={[styles.filterOptionText, activeStyle === s && styles.filterTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* COLORS */}
            {availableColors.length > 0 && (
              <>
                <Text style={styles.filterSectionTitle}>Color</Text>
                <View style={styles.filterWrap}>
                  {availableColors.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorOption,
                        activeColors.includes(c) && styles.colorOptionActive
                      ]}
                      onPress={() => toggleColor(c)}
                    >
                      <View style={[styles.colorCircle, { backgroundColor: getColorHex(c) }]} />
                      <Text style={styles.colorName}>{c}</Text>
                      {activeColors.includes(c) && (
                        <View style={styles.checkIcon}>
                          <Check size={12} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyText}>Ver Resultados ({filteredWallpapers.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// Helper for color dots
function getColorHex(colorName: string) {
  const map: Record<string, string> = {
    'Beige': '#F5F5DC', 'Gris': '#808080', 'Azul': '#0000FF',
    'Verde': '#008000', 'Negro': '#000000', 'Blanco': '#FFFFFF',
    'Dorado': '#FFD700', 'Rosa': '#FFC0CB', 'Rojo': '#FF0000'
  };
  return map[colorName] || '#CCC';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 10 }, // Increased padding for touch target
  headerTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  filterBtn: { padding: 8 },

  activeFilters: { paddingHorizontal: 16, paddingBottom: 12 },
  filterGap: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, gap: 6 },
  chipText: { color: '#FFF', fontSize: 12, fontFamily: 'Lato_700Bold' },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#FFF' },

  gridContent: { padding: 8 },
  gridRow: { gap: 0 },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: 'PlayfairDisplay_400Regular', fontSize: 18, marginBottom: 10 },
  emptyAction: { fontFamily: 'Lato_700Bold', color: Colors.light.primary, textDecorationLine: 'underline' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFF', paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 24, fontFamily: 'PlayfairDisplay_600SemiBold' },
  modalContent: { padding: 20 },

  filterSectionTitle: { fontSize: 18, fontFamily: 'Lato_700Bold', marginBottom: 15, marginTop: 10 },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  filterOption: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1, borderColor: '#DDD', marginBottom: 5 },
  filterOptionActive: { backgroundColor: '#333', borderColor: '#333' },
  filterOptionText: { fontFamily: 'Lato_400Regular', fontSize: 14 },
  filterTextActive: { color: '#FFF', fontWeight: 'bold' },

  colorOption: { width: '30%', alignItems: 'center', marginBottom: 15, position: 'relative', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  colorOptionActive: { borderColor: Colors.light.primary, backgroundColor: '#F9F9F9' },
  colorCircle: { width: 40, height: 40, borderRadius: 20, marginBottom: 5, borderWidth: 1, borderColor: '#EEE' },
  colorName: { fontSize: 12, fontFamily: 'Lato_400Regular' },
  checkIcon: { position: 'absolute', top: 5, right: 5, backgroundColor: Colors.light.primary, borderRadius: 10, padding: 2 },

  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 12, // Space between Back and Filter
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: 'Lato_400Regular',
    fontSize: 14,
    color: '#000',
    height: '100%',
  },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  applyBtn: { backgroundColor: Colors.light.primary, padding: 16, alignItems: 'center', borderRadius: 8 },
  applyText: { color: '#FFF', fontFamily: 'Lato_700Bold', fontSize: 16 }
});
