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
  Modal
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, Filter, X, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { WallpaperCard } from '@/components/WallpaperCard';
import { Wallpaper } from '@/constants/wallpapers';
import { useFonts, PlayfairDisplay_600SemiBold, PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Extend colors for filtering
const AVAILABLE_COLORS = [
  'Beige', 'Gris', 'Azul', 'Verde', 'Negro', 'Blanco', 'Dorado', 'Rosa', 'Rojo'
];

const AVAILABLE_STYLES = [
  'Floral', 'Geométrico', 'Textura', 'Lujo', 'Moderno', 'Clásico', 'Vintage'
];

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ style?: string; search?: string }>();
  const { wallpapers } = useWallpapers();

  // Local State
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [activeColors, setActiveColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Sync params with state on load
  useEffect(() => {
    if (params.style) setActiveStyle(params.style);
  }, [params.style]);

  // Load Fonts
  let [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_400Regular,
    Lato_400Regular,
    Lato_700Bold
  });

  const numColumns = useMemo(() => (SCREEN_WIDTH >= 1024 ? 4 : SCREEN_WIDTH >= 768 ? 3 : 2), []);

  const filteredWallpapers = useMemo(() => {
    return wallpapers.filter(w => {
      // Filter by Style (Category)
      if (activeStyle) {
        // Normalize strings for comparison (remove accents, lowercase)
        const wStyle = w.style?.toLowerCase() || '';
        const filterStyle = activeStyle.toLowerCase();
        if (!wStyle.includes(filterStyle)) return false;
      }

      // Filter by Color
      if (activeColors.length > 0) {
        const wColors = w.colors || [];
        // Check if any of the active colors match the wallpaper colors
        const hasColor = activeColors.some(c =>
          wColors.some(wc => wc.toLowerCase().includes(c.toLowerCase()))
        );
        if (!hasColor) return false;
      }

      // Filter by Search
      if (params.search) {
        const search = params.search.toLowerCase();
        if (!w.name.toLowerCase().includes(search) && !w.id.toLowerCase().includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [wallpapers, activeStyle, activeColors, params.search]);

  const toggleColor = (color: string) => {
    setActiveColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;

  const clearFilters = () => {
    setActiveStyle(null);
    setActiveColors([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Catálogo</Text>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterBtn}>
            <Filter color="#000" size={24} />
          </TouchableOpacity>
        </View>

        {/* ACTIVE FILTERS BAR */}
        <View style={styles.activeFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterGap}>
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

            {/* STYLES */}
            <Text style={styles.filterSectionTitle}>Estilo</Text>
            <View style={styles.filterWrap}>
              {AVAILABLE_STYLES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterOption, activeStyle === s && styles.filterOptionActive]}
                  onPress={() => setActiveStyle(s === activeStyle ? null : s)}
                >
                  <Text style={[styles.filterOptionText, activeStyle === s && styles.filterTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* COLORS */}
            <Text style={styles.filterSectionTitle}>Color</Text>
            <View style={styles.filterWrap}>
              {AVAILABLE_COLORS.map(c => (
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
  backBtn: { padding: 8 },
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

  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  applyBtn: { backgroundColor: Colors.light.primary, padding: 16, alignItems: 'center', borderRadius: 8 },
  applyText: { color: '#FFF', fontFamily: 'Lato_700Bold', fontSize: 16 }
});
