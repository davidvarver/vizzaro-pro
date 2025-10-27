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
import { Search, Filter, X } from 'lucide-react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { Wallpaper, getCategoriesFromWallpapers, getStylesFromWallpapers, getColorsFromWallpapers } from '@/constants/wallpapers';

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ search?: string; category?: string; style?: string; colors?: string }>();
  const { wallpapers, isLoading } = useWallpapers();
  
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
            <Search size={20} color={Colors.light.textSecondary} style={styleSheet.searchIcon} />
            <TextInput
              style={styleSheet.searchInput}
              placeholder="Busca: geométrico, beige, mármol..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.light.textSecondary}
              returnKeyType="search"
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styleSheet.clearButton}>
                <X size={18} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            )}
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
            <View style={styleSheet.filterRow}>
              <Text style={styleSheet.filterLabel}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styleSheet.filterChips}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styleSheet.filterChip,
                      selectedCategory === cat && styleSheet.filterChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styleSheet.filterChipText,
                        selectedCategory === cat && styleSheet.filterChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styleSheet.filterRow}>
              <Text style={styleSheet.filterLabel}>Estilo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styleSheet.filterChips}>
                {availableStyles.map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styleSheet.filterChip,
                      selectedStyle === style && styleSheet.filterChipActive,
                    ]}
                    onPress={() => setSelectedStyle(style)}
                  >
                    <Text
                      style={[
                        styleSheet.filterChipText,
                        selectedStyle === style && styleSheet.filterChipTextActive,
                      ]}
                    >
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styleSheet.filterRow}>
              <Text style={styleSheet.filterLabel}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styleSheet.filterChips}>
                {availableColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styleSheet.filterChip,
                      selectedColor === color && styleSheet.filterChipActive,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    <Text
                      style={[
                        styleSheet.filterChipText,
                        selectedColor === color && styleSheet.filterChipTextActive,
                      ]}
                    >
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

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
                <TouchableOpacity
                  key={wallpaper.id}
                  style={styleSheet.wallpaperCard}
                  onPress={() => handleWallpaperPress(wallpaper)}
                >
                  <Image
                    source={{ uri: wallpaper.imageUrls?.[0] || wallpaper.imageUrl }}
                    style={styleSheet.wallpaperImage}
                  />
                  {!wallpaper.inStock && (
                    <View style={styleSheet.outOfStockBadge}>
                      <Text style={styleSheet.outOfStockText}>Agotado</Text>
                    </View>
                  )}
                  <View style={styleSheet.wallpaperInfo}>
                    <Text style={styleSheet.wallpaperName} numberOfLines={2}>
                      {wallpaper.name}
                    </Text>
                    <Text style={styleSheet.wallpaperCategory} numberOfLines={1}>
                      {wallpaper.category} • {wallpaper.style}
                    </Text>
                    <Text style={styleSheet.wallpaperPrice}>desde ${wallpaper.price}</Text>
                  </View>
                </TouchableOpacity>
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
  },
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
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 16,
    marginBottom: 8,
  },
  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.light.background,
  },
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
    width: '48%',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  wallpaperImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.light.border,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  wallpaperInfo: {
    padding: 12,
    gap: 4,
  },
  wallpaperName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  wallpaperCategory: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  wallpaperPrice: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
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
