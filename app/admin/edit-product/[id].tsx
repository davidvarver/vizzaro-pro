import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Save,
  DollarSign,
  Type,
  Tag,
  Palette,
  Ruler,
  Settings,
  Plus,
  Home,
} from 'lucide-react-native';
import { Wallpaper } from '@/constants/wallpapers';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import AdminGuard from '@/components/AdminGuard';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getWallpaperById, updateWallpaper, isLoading: wallpapersLoading } = useWallpapers();
  const { token } = useAuth();
  
  const originalProduct = getWallpaperById(id || '');
  
  const [formData, setFormData] = useState<Wallpaper | null>(null);

  const [colorInput, setColorInput] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showStyleModal, setShowStyleModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newStyleName, setNewStyleName] = useState<string>('');

  const [categories, setCategories] = useState<string[]>([
    'Floral',
    'Geométrico',
    'Textura',
    'Rayas',
    'Tropical',
    'Moderno',
    'Clásico',
    'Infantil',
  ]);

  const [stylesOptions, setStylesOptions] = useState<string[]>([
    'Elegante',
    'Moderno',
    'Clásico',
    'Minimalista',
    'Vintage',
    'Contemporáneo',
    'Rústico',
    'Bohemio',
  ]);

  useEffect(() => {
    if (originalProduct) {
      // Ensure imageUrls is always an array
      const productWithImageUrls = {
        ...originalProduct,
        imageUrls: originalProduct.imageUrls || [originalProduct.imageUrl].filter(Boolean)
      };
      setFormData(productWithImageUrls);
    }
  }, [originalProduct]);

  if (wallpapersLoading || !formData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Cargando...</Text>
      </View>
    );
  }

  if (!originalProduct) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Producto no encontrado</Text>
      </View>
    );
  }

  const materials = ['Vinilo', 'No tejido', 'Papel', 'Vinilo Premium'];

  const handleSave = async () => {
    console.log('=== INICIANDO GUARDADO ===');
    console.log('Form data completo:', JSON.stringify(formData, null, 2));
    console.log('showInHome value:', formData.showInHome);
    console.log('Original product:', originalProduct);
    
    if (!formData.name.trim()) {
      console.log('Error: Nombre vacío');
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'El nombre del producto es requerido');
      }
      return;
    }

    if (!formData.description.trim()) {
      console.log('Error: Descripción vacía');
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'La descripción del producto es requerida');
      }
      return;
    }

    if (formData.price <= 0) {
      console.log('Error: Precio inválido');
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'El precio debe ser mayor a 0');
      }
      return;
    }

    if (!formData.imageUrls || formData.imageUrls.length === 0) {
      console.log('Error: Sin imágenes');
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Al menos una imagen es requerida');
      }
      return;
    }

    if (!formData.colors || formData.colors.length === 0) {
      console.log('Error: Sin colores');
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Debe agregar al menos un color');
      }
      return;
    }

    try {
      console.log('Llamando updateWallpaper con:', JSON.stringify(formData, null, 2));
      console.log('showInHome antes de guardar:', formData.showInHome);
      console.log('Admin token:', token);
      
      if (!token) {
        console.error('No admin token available');
        const errorMsg = 'No hay sesión de administrador activa. Por favor cierra sesión e inicia sesión nuevamente.';
        if (Platform.OS !== 'web') {
          Alert.alert('Error de Autenticación', errorMsg);
        } else {
          alert(errorMsg);
        }
        return;
      }
      
      const success = await updateWallpaper(formData, token);
      console.log('Resultado de updateWallpaper:', success);
      
      if (success) {
        console.log('Producto actualizado exitosamente:', formData);
        
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Producto Actualizado',
            'Los cambios se han guardado exitosamente',
            [
              { text: 'OK', onPress: () => router.back() }
            ]
          );
        } else {
          console.log('Navegando de vuelta...');
          alert('Producto actualizado exitosamente');
          router.back();
        }
      } else {
        console.log('Error: updateWallpaper retornó false');
        const errorMsg = 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
        if (Platform.OS !== 'web') {
          Alert.alert('Error', errorMsg);
        } else {
          alert(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      const errorMsg = error instanceof Error ? error.message : 'Ocurrió un error al guardar los cambios.';
      console.error('Error details:', errorMsg);
      
      if (Platform.OS !== 'web') {
        Alert.alert('Error', errorMsg);
      } else {
        alert('Error: ' + errorMsg);
      }
    }
  };

  const addColor = () => {
    if (colorInput.trim() && formData && !formData.colors.includes(colorInput.trim())) {
      setFormData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          colors: [...(prev.colors || []), colorInput.trim()]
        };
      });
      setColorInput('');
    }
  };

  const removeColor = (colorToRemove: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        colors: (prev.colors || []).filter(color => color !== colorToRemove)
      };
    });
  };

  const addImageUrl = () => {
    if (imageUrlInput.trim() && formData && !formData.imageUrls.includes(imageUrlInput.trim())) {
      setFormData(prev => {
        if (!prev) return prev;
        const newImageUrls = [...(prev.imageUrls || []), imageUrlInput.trim()];
        return {
          ...prev,
          imageUrls: newImageUrls,
          imageUrl: prev.imageUrl || imageUrlInput.trim() // Set as main if first image
        };
      });
      setImageUrlInput('');
    }
  };

  const removeImageUrl = (urlToRemove: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      const newImageUrls = (prev.imageUrls || []).filter(url => url !== urlToRemove);
      return {
        ...prev,
        imageUrls: newImageUrls,
        imageUrl: newImageUrls.length > 0 ? newImageUrls[0] : ''
      };
    });
  };

  const addNewCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'El nombre de la categoría no puede estar vacío');
      return;
    }
    
    if (categories.includes(newCategoryName.trim())) {
      Alert.alert('Error', 'Esta categoría ya existe');
      return;
    }
    
    const newCategory = newCategoryName.trim();
    setCategories(prev => [...prev, newCategory]);
    setFormData(prev => prev ? ({ ...prev, category: newCategory }) : null);
    setNewCategoryName('');
    setShowCategoryModal(false);
    Alert.alert('Éxito', `Categoría "${newCategory}" agregada correctamente`);
  };

  const addNewStyle = () => {
    if (!newStyleName.trim()) {
      Alert.alert('Error', 'El nombre del estilo no puede estar vacío');
      return;
    }
    
    if (stylesOptions.includes(newStyleName.trim())) {
      Alert.alert('Error', 'Este estilo ya existe');
      return;
    }
    
    const newStyle = newStyleName.trim();
    setStylesOptions(prev => [...prev, newStyle]);
    setFormData(prev => prev ? ({ ...prev, style: newStyle }) : null);
    setNewStyleName('');
    setShowStyleModal(false);
    Alert.alert('Éxito', `Estilo "${newStyle}" agregado correctamente`);
  };

  return (
    <AdminGuard>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Producto</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Save size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Type size={20} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Información Básica</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Producto</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => prev ? ({ ...prev, name: text }) : null)}
              placeholder="Ej: Papel Tapiz Floral Elegante"
              placeholderTextColor={Colors.light.tabIconDefault}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => prev ? ({ ...prev, description: text }) : null)}
              placeholder="Descripción detallada del producto..."
              placeholderTextColor={Colors.light.tabIconDefault}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Imágenes del Producto</Text>
            
            {/* Input para agregar nueva URL */}
            <View style={styles.colorInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={imageUrlInput}
                onChangeText={setImageUrlInput}
                placeholder="https://ejemplo.com/imagen.jpg"
                placeholderTextColor={Colors.light.tabIconDefault}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.addColorButton} onPress={addImageUrl}>
                <Text style={styles.addColorButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de imágenes */}
            <View style={styles.colorsContainer}>
              {(formData.imageUrls || []).map((imageUrl, index) => (
                <TouchableOpacity
                  key={imageUrl}
                  style={styles.colorChip}
                  onPress={() => removeImageUrl(imageUrl)}
                >
                  <Text style={styles.colorChipText} numberOfLines={1}>
                    {index === 0 ? '(Principal) ' : ''}{imageUrl.length > 30 ? imageUrl.substring(0, 30) + '...' : imageUrl}
                  </Text>
                  <Text style={styles.colorChipRemove}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Precio y Stock</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Precio por Rollo ($)</Text>
            <TextInput
              style={styles.input}
              value={formData.price.toString()}
              onChangeText={(text) => setFormData(prev => prev ? ({ ...prev, price: parseFloat(text) || 0 }) : null)}
              placeholder="45.99"
              placeholderTextColor={Colors.light.tabIconDefault}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.inputLabel}>En Stock</Text>
            <Switch
              value={formData.inStock}
              onValueChange={(value) => setFormData(prev => prev ? ({ ...prev, inStock: value }) : null)}
              trackColor={{ false: Colors.light.tabIconDefault, true: Colors.light.tint }}
              thumbColor={formData.inStock ? Colors.light.background : Colors.light.background}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Tag size={20} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Categorización</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.labelWithButton}>
              <Text style={styles.inputLabel}>Categoría</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowCategoryModal(true)}
              >
                <Plus size={16} color={Colors.light.tint} />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.optionChip,
                    formData.category === category && styles.optionChipSelected
                  ]}
                  onPress={() => setFormData(prev => prev ? ({ ...prev, category }) : null)}
                >
                  <Text style={[
                    styles.optionChipText,
                    formData.category === category && styles.optionChipTextSelected
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelWithButton}>
              <Text style={styles.inputLabel}>Estilo</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowStyleModal(true)}
              >
                <Plus size={16} color={Colors.light.tint} />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {stylesOptions.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.optionChip,
                    formData.style === style && styles.optionChipSelected
                  ]}
                  onPress={() => setFormData(prev => prev ? ({ ...prev, style }) : null)}
                >
                  <Text style={[
                    styles.optionChipText,
                    formData.style === style && styles.optionChipTextSelected
                  ]}>
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Colores</Text>
          </View>
          
          <View style={styles.colorInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={colorInput}
              onChangeText={setColorInput}
              placeholder="Agregar color..."
              placeholderTextColor={Colors.light.tabIconDefault}
            />
            <TouchableOpacity style={styles.addColorButton} onPress={addColor}>
              <Text style={styles.addColorButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.colorsContainer}>
            {(formData.colors || []).map((color) => (
              <TouchableOpacity
                key={color}
                style={styles.colorChip}
                onPress={() => removeColor(color)}
              >
                <Text style={styles.colorChipText}>{color}</Text>
                <Text style={styles.colorChipRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ruler size={20} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Dimensiones</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Ancho (m)</Text>
              <TextInput
                style={styles.input}
                value={formData.dimensions.width.toString()}
                onChangeText={(text) => setFormData(prev => prev ? ({
                  ...prev,
                  dimensions: { ...prev.dimensions, width: parseFloat(text) || 0 }
                }) : null)}
                placeholder="0.53"
                placeholderTextColor={Colors.light.tabIconDefault}
                keyboardType="decimal-pad"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Alto (m)</Text>
              <TextInput
                style={styles.input}
                value={formData.dimensions.height.toString()}
                onChangeText={(text) => setFormData(prev => prev ? ({
                  ...prev,
                  dimensions: { ...prev.dimensions, height: parseFloat(text) || 0 }
                }) : null)}
                placeholder="10.05"
                placeholderTextColor={Colors.light.tabIconDefault}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cobertura por Rollo (m²)</Text>
            <TextInput
              style={styles.input}
              value={formData.dimensions.coverage.toString()}
              onChangeText={(text) => setFormData(prev => prev ? ({
                ...prev,
                dimensions: { ...prev.dimensions, coverage: parseFloat(text) || 0 }
              }) : null)}
              placeholder="5.33"
              placeholderTextColor={Colors.light.tabIconDefault}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Especificaciones</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Material</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {materials.map((material) => (
                <TouchableOpacity
                  key={material}
                  style={[
                    styles.optionChip,
                    formData.specifications.material === material && styles.optionChipSelected
                  ]}
                  onPress={() => setFormData(prev => prev ? ({
                    ...prev,
                    specifications: { ...prev.specifications, material }
                  }) : null)}
                >
                  <Text style={[
                    styles.optionChipText,
                    formData.specifications.material === material && styles.optionChipTextSelected
                  ]}>
                    {material}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.inputLabel}>Lavable</Text>
            <Switch
              value={formData.specifications.washable}
              onValueChange={(value) => setFormData(prev => prev ? ({
                ...prev,
                specifications: { ...prev.specifications, washable: value }
              }) : null)}
              trackColor={{ false: Colors.light.tabIconDefault, true: Colors.light.tint }}
              thumbColor={formData.specifications.washable ? Colors.light.background : Colors.light.background}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.inputLabel}>Removible</Text>
            <Switch
              value={formData.specifications.removable}
              onValueChange={(value) => setFormData(prev => prev ? ({
                ...prev,
                specifications: { ...prev.specifications, removable: value }
              }) : null)}
              trackColor={{ false: Colors.light.tabIconDefault, true: Colors.light.tint }}
              thumbColor={formData.specifications.removable ? Colors.light.background : Colors.light.background}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.inputLabel}>Texturizado</Text>
            <Switch
              value={formData.specifications.textured}
              onValueChange={(value) => setFormData(prev => prev ? ({
                ...prev,
                specifications: { ...prev.specifications, textured: value }
              }) : null)}
              trackColor={{ false: Colors.light.tabIconDefault, true: Colors.light.tint }}
              thumbColor={formData.specifications.textured ? Colors.light.background : Colors.light.background}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Home size={20} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>Visibilidad</Text>
          </View>
          
          <View style={styles.switchGroup}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.inputLabel}>Mostrar en home</Text>
              <Text style={styles.switchDescription}>
                Este producto aparecerá en la pantalla principal
              </Text>
            </View>
            <Switch
              value={formData.showInHome || false}
              onValueChange={(value) => setFormData(prev => prev ? ({ ...prev, showInHome: value }) : null)}
              trackColor={{ false: Colors.light.tabIconDefault, true: Colors.light.tint }}
              thumbColor={formData.showInHome ? Colors.light.background : Colors.light.background}
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal para agregar nueva categoría */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Nueva Categoría</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={addNewCategory}
              >
                <Text style={styles.modalButtonTextConfirm}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para agregar nuevo estilo */}
      <Modal
        visible={showStyleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStyleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Nuevo Estilo</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del estilo"
              value={newStyleName}
              onChangeText={setNewStyleName}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowStyleModal(false);
                  setNewStyleName('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={addNewStyle}
              >
                <Text style={styles.modalButtonTextConfirm}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  saveButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionsScroll: {
    marginTop: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  optionChipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  optionChipTextSelected: {
    color: '#FFFFFF',
  },
  colorInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addColorButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addColorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 6,
  },
  colorChipText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  colorChipRemove: {
    fontSize: 16,
    color: Colors.light.error,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
  },
  bottomPadding: {
    height: 40,
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.error,
    textAlign: 'center',
    marginTop: 50,
  },
  labelWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.light.tint,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 4,
  },
});