import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Plus,
  Edit3,
  Trash2,
  Package,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react-native';
import { Wallpaper } from '@/constants/wallpapers';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import WhatsAppButton from '@/components/WhatsAppButton';
import AdminGuard from '@/components/AdminGuard';

export default function AdminCatalogScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { wallpapers: catalogItems, updateWallpaper, deleteWallpaper, isLoading, error: contextError, refetchWallpapers, resetCatalog } = useWallpapers();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const categories = [
    { key: 'all', label: 'Todos' },
    { key: 'Floral', label: 'Floral' },
    { key: 'Geométrico', label: 'Geométrico' },
    { key: 'Textura', label: 'Textura' },
    { key: 'Rayas', label: 'Rayas' },
    { key: 'Tropical', label: 'Tropical' },
  ];

  const validCatalogItems = catalogItems.filter(item => {
    return item && typeof item === 'object' && item.id && item.name;
  });

  const filteredItems = validCatalogItems.filter(item => {
    const matchesSearch = String(item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         String(item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         String(item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleStock = async (itemId: string) => {
    const item = catalogItems.find(item => item.id === itemId);
    if (item && token) {
      console.log('[Catalog] Toggling stock for item:', itemId, 'with token:', token);
      setErrorMessage('');
      try {
        const success = await updateWallpaper({ ...item, inStock: !item.inStock }, token);
        if (success) {
          console.log('[Catalog] Stock toggled successfully');
        } else {
          setErrorMessage('Error al actualizar el stock');
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar el stock');
      }
    }
  };

  const deleteItem = async (itemId: string) => {
    if (token) {
      console.log('[Catalog] Deleting item:', itemId, 'with token:', token);
      setErrorMessage('');
      try {
        const success = await deleteWallpaper(itemId, token);
        if (success) {
          console.log('[Catalog] Item deleted successfully');
        } else {
          setErrorMessage('Error al eliminar el producto');
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Error al eliminar el producto');
      }
    } else {
      setErrorMessage('No hay token de administrador disponible');
    }
  };

  const handleResetCatalog = () => {
    Alert.alert(
      'Resetear Catálogo',
      '¿Estás seguro de que quieres resetear el catálogo a los valores por defecto? Esto eliminará todos los productos actuales y restaurará el catálogo original con imágenes de ejemplo.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            if (!token) {
              setErrorMessage('No hay token de administrador disponible');
              return;
            }
            
            setErrorMessage('');
            try {
              console.log('[Catalog] Starting catalog reset with token:', !!token);
              const success = await resetCatalog(token);
              console.log('[Catalog] Reset result:', success);
              if (success) {
                console.log('[Catalog] Refetching wallpapers...');
                await refetchWallpapers();
                Alert.alert('Éxito', 'Catálogo reseteado correctamente. Las imágenes ahora deberían cargarse correctamente.');
              } else {
                console.error('[Catalog] Reset returned false');
                setErrorMessage('Error al resetear el catálogo');
              }
            } catch (error) {
              console.error('[Catalog] Reset error:', error);
              const errorMsg = error instanceof Error ? error.message : 'Error al resetear el catálogo';
              setErrorMessage(errorMsg);
              Alert.alert('Error', errorMsg);
            }
          },
        },
      ]
    );
  };

  const ProductCard = ({ item }: { item: Wallpaper }) => {
    const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
    const dimensions = {
      width: typeof item.dimensions?.width === 'number' && !isNaN(item.dimensions.width) ? item.dimensions.width : 0.53,
      height: typeof item.dimensions?.height === 'number' && !isNaN(item.dimensions.height) ? item.dimensions.height : 10.05,
      coverage: typeof item.dimensions?.coverage === 'number' && !isNaN(item.dimensions.coverage) ? item.dimensions.coverage : 5.33,
    };
    const style = item.style || 'Sin estilo';
    const category = item.category || 'General';
    const name = item.name || 'Sin nombre';
    const description = item.description || '';
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productImageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
          {item.inStock && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>En Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{name}</Text>
          <Text style={styles.productPrice}>${price.toFixed(2)}</Text>
        
        {description && (
          <Text style={styles.productDescription} numberOfLines={1}>
            {description}
          </Text>
        )}
        
        <View style={styles.colorDots}>
          <View style={[styles.colorDot, { backgroundColor: '#8B4513' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#4169E1' }]} />
          <View style={[styles.colorDot, { backgroundColor: '#FFD700' }]} />
          <Text style={styles.productStyle}>{style}</Text>
        </View>

        <Text style={styles.specText}>
          {dimensions.width}m x {dimensions.height}m
        </Text>
        <Text style={styles.specText}>
          {dimensions.coverage}m² por rollo
        </Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.stockToggleButton}
            onPress={() => toggleStock(item.id)}
          >
            {item.inStock ? (
              <Eye size={14} color="#10B981" />
            ) : (
              <EyeOff size={14} color="#EF4444" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/admin/edit-product/${item.id}`)}
          >
            <Edit3 size={14} color="#3B82F6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteItem(item.id)}
          >
            <Trash2 size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
    );
  };

  return (
    <AdminGuard>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Catálogo</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/admin/add-product')}
        >
          <Plus size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.light.tabIconDefault} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.filterChip,
              selectedCategory === category.key && styles.filterChipActive
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Text style={[
              styles.filterChipText,
              selectedCategory === category.key && styles.filterChipTextActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.statsBar}>
        <View style={styles.statsLeft}>
          <Text style={styles.statsText}>
            {filteredItems.length} productos encontrados
          </Text>
          <Text style={styles.statsText}>
            {filteredItems.filter(item => item.inStock).length} en stock
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={handleResetCatalog}
        >
          <RotateCcw size={14} color="#EF4444" />
          <Text style={styles.resetButtonText}>Resetear</Text>
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage('')}>
            <Text style={styles.errorClose}>×</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {contextError && !isLoading ? (
        <View style={styles.errorState}>
          <Package size={48} color="#EF4444" />
          <Text style={styles.errorStateTitle}>Error al cargar catálogo</Text>
          <Text style={styles.errorStateText}>{contextError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => refetchWallpapers()}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Cargando catálogo...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={48} color={Colors.light.tabIconDefault} />
          <Text style={styles.emptyStateText}>
            {searchQuery || selectedCategory !== 'all' 
              ? 'No se encontraron productos con los filtros aplicados'
              : 'No hay productos en el catálogo'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={({ item }) => <ProductCard item={item} />}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.whatsappSection}>
              <Text style={styles.whatsappTitle}>¿Necesitas ayuda con el catálogo?</Text>
              <WhatsAppButton
                message="Hola, necesito ayuda con la gestión del catálogo de papel tapiz"
                style="secondary"
                size="medium"
              />
            </View>
          }
        />
      )}
    </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 4,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  statsLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  statsText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  content: {
    flex: 1,
  },
  gridContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    maxWidth: 280,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 10,
    color: Colors.light.tabIconDefault,
    marginBottom: 6,
  },
  colorDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productStyle: {
    fontSize: 9,
    color: Colors.light.tabIconDefault,
  },
  specText: {
    fontSize: 9,
    color: Colors.light.tabIconDefault,
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  stockToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappSection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
    width: '100%',
  },
  whatsappTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  errorClose: {
    fontSize: 24,
    color: '#991B1B',
    fontWeight: 'bold',
    marginLeft: 8,
    marginTop: -4,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 16,
  },
  errorStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'center',
  },
  errorStateText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    maxWidth: 320,
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});