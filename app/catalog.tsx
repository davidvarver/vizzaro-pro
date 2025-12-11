import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Filter, X } from 'lucide-react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpaperStore } from '@/stores/useWallpaperStore';
import { Wallpaper, getCategoriesFromWallpapers, getStylesFromWallpapers, getColorsFromWallpapers } from '@/constants/wallpapers';
import { WallpaperCard } from '@/components/WallpaperCard';
import { SearchBar } from '@/components/SearchBar';
import { FilterGroup } from '@/components/FilterGroup';

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ search?: string; category?: string; style?: string; colors?: string }>();
  const { wallpapers, isLoading } = useWallpaperStore();

  const [searchQuery, setSearchQuery] = useState<string>(params.search || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || 'Todos');
  const [selectedStyle, setSelectedStyle] = useState<string>(params.style || 'Todos');
  const [selectedColor, setSelectedColor] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const categories = useMemo(() => getCategoriesFromWallpapers(wallpapers), [wallpapers]);
  const availableStyles = useMemo(() => getStylesFromWallpapers(wallpapers), [wallpapers]);
  const availableColors = useMemo(() => getColorsFromWallpapers(wallpapers), [wallpapers]);

  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search);
    }
    if (params.category) {
      setSelectedCategory(params.category);
    }
    if (params.style) {
      setSelectedStyle(params.style);
    }
    if (params.colors) {
      const colorList = params.colors.split(',');
      if (colorList.length > 0) {
        setSelectedColor(colorList[0]);
      }
    }
  }, [params]);

  const filteredWallpapers = useMemo(() => {
    let filtered = [...wallpapers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query) ||
          w.category.toLowerCase().includes(query) ||
          w.style.toLowerCase().includes(query) ||
          w.colors.some((c) => c.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter((w) => w.category === selectedCategory);
    }

    if (selectedStyle !== 'Todos') {
      filtered = filtered.filter((w) => w.style === selectedStyle);
    }

    if (selectedColor !== 'Todos') {
      filtered = filtered.filter((w) => w.colors.includes(selectedColor));
    }

    return filtered;
  }, [wallpapers, searchQuery, selectedCategory, selectedStyle, selectedColor]);

  const handleWallpaperPress = useCallback((wallpaper: Wallpaper) => {
    router.push(`/wallpaper/${wallpaper.id}`);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedStyle('Todos');
    setSelectedColor('Todos');
    router.setParams({ search: undefined, category: undefined, style: undefined, colors: undefined });
  }, []);

  const hasActiveFilters = searchQuery.trim() || selectedCategory !== 'Todos' || selectedStyle !== 'Todos' || selectedColor !== 'Todos';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Catálogo',
          headerStyle: {
            backgroundColor: Colors.light.background,
          },
          headerTintColor: Colors.light.text,
          headerShadowVisible: false,
        }}
      />
      <View style={styleSheet.container}>
        <View style={[styleSheet.searchSection, { paddingTop: insets.top }]}>
          <View style={styleSheet.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Busca: geométrico, beige, mármol..."
              onClear={() => setSearchQuery('')}
              containerStyle={{ flex: 1, borderWidth: 0 }}
            />
          </View>

          <TouchableOpacity
            style={styleSheet.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={Colors.light.primary} />
            {hasActiveFilters && <View style={styleSheet.filterBadge} />}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styleSheet.filtersContainer}>
            <FilterGroup
              label="Categoría"
              options={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />

            <FilterGroup
              label="Estilo"
              options={availableStyles}
              selected={selectedStyle}
              onSelect={setSelectedStyle}
            />

            <FilterGroup
              label="Color"
              options={availableColors}
              selected={selectedColor}
              onSelect={setSelectedColor}
            />

            {hasActiveFilters && (
              <TouchableOpacity style={styleSheet.clearFiltersButton} onPress={clearFilters}>
                <X size={16} color={Colors.light.background} />
                <Text style={styleSheet.clearFiltersText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styleSheet.resultsHeader}>
          <Text style={styleSheet.resultsText}>
            {filteredWallpapers.length} {filteredWallpapers.length === 1 ? 'resultado' : 'resultados'}
          </Text>
        </View>

        {isLoading ? (
          <View style={styleSheet.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styleSheet.loadingText}>Cargando catálogo...</Text>
          </View>
        ) : (
          <ScrollView
            style={styleSheet.scrollView}
            contentContainerStyle={styleSheet.wallpapersGrid}
            showsVerticalScrollIndicator={false}
          >
            {filteredWallpapers.length === 0 ? (
              <View style={styleSheet.emptyContainer}>
                <Text style={styleSheet.emptyText}>No se encontraron resultados</Text>
                <Text style={styleSheet.emptySubtext}>
                  Intenta ajustar tus filtros de búsqueda
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity style={styleSheet.emptyButton} onPress={clearFilters}>
                    <Text style={styleSheet.emptyButtonText}>Limpiar filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredWallpapers.map((wallpaper) => (
                <WallpaperCard
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  onPress={handleWallpaperPress}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styleSheet = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  // searchInput removed
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },
  filtersContainer: {
    backgroundColor: Colors.light.card,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  // Filter styles removed as now in component

  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  clearFiltersText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
  },
  resultsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  wallpapersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  wallpaperCard: {
    // Kept for layout if needed, or removed if handled by component
  },
  // Individual wallpaper card styles removed as they are now in WallpaperCard component
  emptyContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
});
