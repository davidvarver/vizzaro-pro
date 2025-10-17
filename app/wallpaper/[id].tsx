import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  ShoppingCart,

  Info,
  Ruler,
  Palette,
  Package,
  CheckCircle,
  XCircle,
  Calculator,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';



export default function WallpaperDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getWallpaperById } = useWallpapers();
  const { addToCart, isInCart } = useCart();
  const { addToFavorites, favoriteProjects, addWallpaperToProject } = useFavorites();

  

  const [purchaseType, setPurchaseType] = useState<'roll' | 'measurement'>('roll');
  const [showMeasurementModal, setShowMeasurementModal] = useState<boolean>(false);
  const [wallWidth, setWallWidth] = useState<string>('');
  const [wallHeight, setWallHeight] = useState<string>('');
  const [rollQuantity, setRollQuantity] = useState<number>(1);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showSaveProjectModal, setShowSaveProjectModal] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('');
  const [roomType, setRoomType] = useState<string>('sala');
  const [projectNotes, setProjectNotes] = useState<string>('');
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('existing');
  const [selectedExistingProjectId, setSelectedExistingProjectId] = useState<string>('');
  
  const { width: screenWidth } = Dimensions.get('window');
  
  const wallArea = wallWidth && wallHeight ? parseFloat(wallWidth) * parseFloat(wallHeight) : 10;
  
  const wallpaper = getWallpaperById(id || '');
  
  if (!wallpaper) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Papel tapiz no encontrado</Text>
      </View>
    );
  }

  const rollsNeeded = Math.ceil(wallArea / wallpaper.dimensions.coverage);
  const totalPrice = wallpaper.price * rollsNeeded;
  const isAlreadyInCart = isInCart(wallpaper.id);

  const handleAddToCart = () => {
    if (!wallpaper.inStock) {
      if (Platform.OS !== 'web') {
        Alert.alert('Producto Agotado', 'Este papel tapiz no está disponible actualmente.');
      }
      return;
    }
    
    if (purchaseType === 'measurement' && (!wallWidth || !wallHeight)) {
      if (Platform.OS !== 'web') {
        Alert.alert('Medidas Requeridas', 'Por favor ingresa las medidas de tu pared.');
      }
      return;
    }
    
    const finalRollsNeeded = purchaseType === 'roll' ? rollQuantity : rollsNeeded;
    const finalWallArea = purchaseType === 'roll' ? rollQuantity * wallpaper.dimensions.coverage : wallArea;
    
    addToCart(wallpaper, finalRollsNeeded, finalWallArea, purchaseType);
    if (Platform.OS !== 'web') {
      const message = purchaseType === 'roll' 
        ? `${rollQuantity} rollo${rollQuantity > 1 ? 's' : ''} de "${wallpaper.name}" agregado${rollQuantity > 1 ? 's' : ''} al carrito.`
        : `${finalRollsNeeded} rollo${finalRollsNeeded > 1 ? 's' : ''} de "${wallpaper.name}" para ${wallArea.toFixed(1)}m² agregado${finalRollsNeeded > 1 ? 's' : ''} al carrito.`;
      
      Alert.alert(
        'Agregado al Carrito',
        message,
        [
          { text: 'Continuar Comprando', style: 'cancel' },
          { text: 'Ver Carrito', onPress: () => router.push('/(tabs)/cart') },
        ]
      );
    }
  };

  const handleGoToCamera = () => {
    console.log('=== NAVIGATING TO CAMERA ===');
    console.log('Wallpaper ID:', wallpaper.id);
    console.log('Wallpaper name:', wallpaper.name);
    router.push({
      pathname: '/(tabs)/camera',
      params: { 
        wallpaperId: wallpaper.id,
        source: 'wallpaper-detail'
      }
    });
  };

  const handleSaveToFavorites = () => {
    setShowSaveProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (saveMode === 'new') {
      if (!projectName.trim()) {
        if (Platform.OS !== 'web') {
          Alert.alert('Nombre Requerido', 'Por favor ingresa un nombre para tu proyecto.');
        }
        return;
      }

      const savedProject = await addToFavorites(
        projectName.trim(),
        roomType,
        wallpaper,
        undefined,
        projectNotes.trim() || undefined
      );

      if (savedProject) {
        setShowSaveProjectModal(false);
        setProjectName('');
        setRoomType('sala');
        setProjectNotes('');
        setSaveMode('existing');
        setSelectedExistingProjectId('');
        
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Proyecto Guardado',
            `"${savedProject.name}" ha sido guardado en tus favoritos.`,
            [
              { text: 'Continuar', style: 'cancel' },
              { text: 'Ver Favoritos', onPress: () => router.push('/favorites') },
            ]
          );
        }
      }
    } else {
      if (!selectedExistingProjectId) {
        if (Platform.OS !== 'web') {
          Alert.alert('Proyecto Requerido', 'Por favor selecciona un proyecto.');
        }
        return;
      }

      const success = await addWallpaperToProject(selectedExistingProjectId, wallpaper);

      if (success) {
        const project = favoriteProjects.find(p => p.id === selectedExistingProjectId);
        setShowSaveProjectModal(false);
        setSelectedExistingProjectId('');
        setSaveMode('existing');
        
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Papel Agregado',
            `El papel tapiz ha sido agregado a "${project?.name}".`,
            [
              { text: 'Continuar', style: 'cancel' },
              { text: 'Ver Favoritos', onPress: () => router.push('/favorites') },
            ]
          );
        }
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleSaveToFavorites}
        >
          <Heart
            size={24}
            color={Colors.light.text}
            fill={'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {wallpaper.imageUrls && wallpaper.imageUrls.length > 0 ? (
            <>
              <FlatList
                data={wallpaper.imageUrls}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                  setCurrentImageIndex(index);
                }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={[styles.wallpaperImage, { width: screenWidth }]} />
                )}
                keyExtractor={(item, index) => `${item}-${index}`}
              />
              
              {wallpaper.imageUrls.length > 1 && (
                <View style={styles.imageIndicators}>
                  {wallpaper.imageUrls.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        currentImageIndex === index && styles.indicatorActive
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <Image source={{ uri: wallpaper.imageUrl }} style={styles.wallpaperImage} />
          )}
          
          {!wallpaper.inStock && (
            <View style={styles.outOfStockOverlay}>
              <View style={styles.outOfStockBadge}>
                <XCircle size={20} color={Colors.light.background} />
                <Text style={styles.outOfStockText}>Agotado</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.titleSection}>
            <Text style={styles.wallpaperName}>{wallpaper.name}</Text>
            <Text style={styles.wallpaperCategory}>{wallpaper.category} • {wallpaper.style}</Text>
            

          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Precio por rollo</Text>
            <Text style={styles.price}>${wallpaper.price.toFixed(2)}</Text>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{wallpaper.description}</Text>
          </View>

          <View style={styles.colorsSection}>
            <Text style={styles.sectionTitle}>Colores</Text>
            <View style={styles.colorsList}>
              {wallpaper.colors.map((color: string) => (
                <View key={color} style={styles.colorChip}>
                  <Palette size={14} color={Colors.light.primary} />
                  <Text style={styles.colorText}>{color}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.specificationsSection}>
            <Text style={styles.sectionTitle}>Especificaciones</Text>
            
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Ruler size={16} color={Colors.light.primary} />
                <Text style={styles.specLabel}>Dimensiones</Text>
              </View>
              <Text style={styles.specValue}>
                {wallpaper.dimensions.width}m × {wallpaper.dimensions.height}m
              </Text>
            </View>
            
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Package size={16} color={Colors.light.primary} />
                <Text style={styles.specLabel}>Cobertura</Text>
              </View>
              <Text style={styles.specValue}>{wallpaper.dimensions.coverage}m² por rollo</Text>
            </View>
            
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Info size={16} color={Colors.light.primary} />
                <Text style={styles.specLabel}>Material</Text>
              </View>
              <Text style={styles.specValue}>{wallpaper.specifications.material}</Text>
            </View>
            
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                {wallpaper.specifications.washable ? (
                  <CheckCircle size={16} color={Colors.light.success} />
                ) : (
                  <XCircle size={16} color={Colors.light.error} />
                )}
                <Text style={styles.featureText}>Lavable</Text>
              </View>
              
              <View style={styles.featureItem}>
                {wallpaper.specifications.removable ? (
                  <CheckCircle size={16} color={Colors.light.success} />
                ) : (
                  <XCircle size={16} color={Colors.light.error} />
                )}
                <Text style={styles.featureText}>Removible</Text>
              </View>
              
              <View style={styles.featureItem}>
                {wallpaper.specifications.textured ? (
                  <CheckCircle size={16} color={Colors.light.success} />
                ) : (
                  <XCircle size={16} color={Colors.light.error} />
                )}
                <Text style={styles.featureText}>Texturizado</Text>
              </View>
            </View>
          </View>

          <View style={styles.purchaseTypeSection}>
            <Text style={styles.sectionTitle}>Tipo de Compra</Text>
            
            <View style={styles.purchaseOptions}>
              <TouchableOpacity
                style={[
                  styles.purchaseOption,
                  purchaseType === 'roll' && styles.purchaseOptionSelected
                ]}
                onPress={() => setPurchaseType('roll')}
              >
                <Package size={20} color={purchaseType === 'roll' ? Colors.light.primary : Colors.light.textSecondary} />
                <Text style={[
                  styles.purchaseOptionText,
                  purchaseType === 'roll' && styles.purchaseOptionTextSelected
                ]}>Por Rollo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.purchaseOption,
                  purchaseType === 'measurement' && styles.purchaseOptionSelected
                ]}
                onPress={() => setPurchaseType('measurement')}
              >
                <Ruler size={20} color={purchaseType === 'measurement' ? Colors.light.primary : Colors.light.textSecondary} />
                <Text style={[
                  styles.purchaseOptionText,
                  purchaseType === 'measurement' && styles.purchaseOptionTextSelected
                ]}>Por Medida</Text>
              </TouchableOpacity>
            </View>
          </View>

          {purchaseType === 'roll' ? (
            <View style={styles.rollSection}>
              <Text style={styles.sectionTitle}>Cantidad de Rollos</Text>
              <View style={styles.rollQuantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setRollQuantity(Math.max(1, rollQuantity - 1))}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.rollQuantity}>{rollQuantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setRollQuantity(rollQuantity + 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.rollInfo}>
                {rollQuantity} rollo{rollQuantity > 1 ? 's' : ''} • {(rollQuantity * wallpaper.dimensions.coverage).toFixed(1)}m² de cobertura
              </Text>
              <Text style={styles.totalPrice}>Total: ${(wallpaper.price * rollQuantity).toFixed(2)}</Text>
            </View>
          ) : (
            <View style={styles.measurementSection}>
              <Text style={styles.sectionTitle}>Medidas de tu Pared</Text>
              
              <TouchableOpacity
                style={styles.measurementButton}
                onPress={() => setShowMeasurementModal(true)}
              >
                <Calculator size={20} color={Colors.light.primary} />
                <Text style={styles.measurementButtonText}>
                  {wallWidth && wallHeight 
                    ? `${wallWidth}m × ${wallHeight}m = ${wallArea.toFixed(1)}m²`
                    : 'Ingresar Medidas'
                  }
                </Text>
              </TouchableOpacity>
              
              {wallWidth && wallHeight && (
                <View style={styles.calculatorResults}>
                  <Text style={styles.calculatorDescription}>
                    Para {wallArea.toFixed(1)}m² necesitas <Text style={styles.highlight}>{rollsNeeded} rollo{rollsNeeded > 1 ? 's' : ''}</Text>
                  </Text>
                  <Text style={styles.totalPrice}>Total: ${totalPrice.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.tryButton}
          onPress={handleGoToCamera}
        >
          <Text style={styles.tryButtonText}>Probar en mi Pared</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            !wallpaper.inStock && styles.addToCartButtonDisabled,
            isAlreadyInCart && styles.addToCartButtonInCart,
          ]}
          onPress={handleAddToCart}
          disabled={!wallpaper.inStock}
        >
          <ShoppingCart size={20} color={Colors.light.background} />
          <Text style={styles.addToCartButtonText}>
            {!wallpaper.inStock 
              ? 'Agotado' 
              : isAlreadyInCart 
                ? 'Agregar Más' 
                : 'Agregar al Carrito'
            }
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMeasurementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMeasurementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Medidas de tu Pared</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowMeasurementModal(false)}
              >
                <X size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ancho (metros)</Text>
              <TextInput
                style={styles.input}
                value={wallWidth}
                onChangeText={setWallWidth}
                placeholder="Ej: 3.5"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Alto (metros)</Text>
              <TextInput
                style={styles.input}
                value={wallHeight}
                onChangeText={setWallHeight}
                placeholder="Ej: 2.4"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
            
            {wallWidth && wallHeight && (
              <View style={styles.modalCalculation}>
                <Text style={styles.modalCalculationText}>
                  Área total: {wallArea.toFixed(1)}m²
                </Text>
                <Text style={styles.modalCalculationText}>
                  Rollos necesarios: {rollsNeeded}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setShowMeasurementModal(false)}
            >
              <Text style={styles.modalSaveButtonText}>Guardar Medidas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSaveProjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveProjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar a Favoritos</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSaveProjectModal(false)}
              >
                <X size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.saveModeContainer}>
              <TouchableOpacity
                style={[
                  styles.saveModeButton,
                  saveMode === 'existing' && styles.saveModeButtonSelected,
                ]}
                onPress={() => setSaveMode('existing')}
              >
                <Text
                  style={[
                    styles.saveModeButtonText,
                    saveMode === 'existing' && styles.saveModeButtonTextSelected,
                  ]}
                >
                  Proyecto Existente
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveModeButton,
                  saveMode === 'new' && styles.saveModeButtonSelected,
                ]}
                onPress={() => setSaveMode('new')}
              >
                <Text
                  style={[
                    styles.saveModeButtonText,
                    saveMode === 'new' && styles.saveModeButtonTextSelected,
                  ]}
                >
                  Nuevo Proyecto
                </Text>
              </TouchableOpacity>
            </View>
            
            {saveMode === 'existing' ? (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Selecciona un Proyecto</Text>
                {favoriteProjects.length === 0 ? (
                  <View style={styles.emptyProjectsContainer}>
                    <Text style={styles.emptyProjectsText}>
                      No tienes proyectos guardados. Crea uno nuevo.
                    </Text>
                    <TouchableOpacity
                      style={styles.createFirstProjectButton}
                      onPress={() => setSaveMode('new')}
                    >
                      <Text style={styles.createFirstProjectButtonText}>Crear Proyecto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView style={styles.projectsList} showsVerticalScrollIndicator={false}>
                    {favoriteProjects.map((project) => (
                      <TouchableOpacity
                        key={project.id}
                        style={[
                          styles.projectItem,
                          selectedExistingProjectId === project.id && styles.projectItemSelected,
                        ]}
                        onPress={() => setSelectedExistingProjectId(project.id)}
                      >
                        <View style={styles.projectItemContent}>
                          <Text style={styles.projectItemName}>{project.name}</Text>
                          <Text style={styles.projectItemRoom}>{project.roomType}</Text>
                          <Text style={styles.projectItemWallpaper}>
                            {project.wallpapers.length} papel{project.wallpapers.length !== 1 ? 'es' : ''} guardado{project.wallpapers.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        {selectedExistingProjectId === project.id && (
                          <CheckCircle size={20} color={Colors.light.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Nombre del Proyecto</Text>
                  <TextInput
                    style={styles.input}
                    value={projectName}
                    onChangeText={setProjectName}
                    placeholder="Ej: Sala Principal"
                    placeholderTextColor={Colors.light.textSecondary}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Tipo de Habitación</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.roomTypeContainer}
                  >
                    {['sala', 'dormitorio', 'cocina', 'baño', 'comedor', 'oficina'].map((room) => (
                      <TouchableOpacity
                        key={room}
                        style={[
                          styles.roomTypeChip,
                          roomType === room && styles.roomTypeChipSelected,
                        ]}
                        onPress={() => setRoomType(room)}
                      >
                        <Text
                          style={[
                            styles.roomTypeText,
                            roomType === room && styles.roomTypeTextSelected,
                          ]}
                        >
                          {room.charAt(0).toUpperCase() + room.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Notas (Opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={projectNotes}
                    onChangeText={setProjectNotes}
                    placeholder="Agrega notas sobre tu proyecto..."
                    placeholderTextColor={Colors.light.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            )}
            
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveProject}
            >
              <Text style={styles.modalSaveButtonText}>
                {saveMode === 'new' ? 'Crear Proyecto' : 'Agregar a Proyecto'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  wallpaperImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.error,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  outOfStockText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 20,
  },
  wallpaperName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  wallpaperCategory: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },

  priceSection: {
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  colorsSection: {
    marginBottom: 24,
  },
  colorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  colorText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  specificationsSection: {
    marginBottom: 24,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specLabel: {
    fontSize: 16,
    color: Colors.light.text,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  calculatorSection: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  calculatorDescription: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  highlight: {
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 12,
  },
  tryButton: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  tryButtonText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addToCartButtonDisabled: {
    backgroundColor: Colors.light.textSecondary,
  },
  addToCartButtonInCart: {
    backgroundColor: Colors.light.success,
  },
  addToCartButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.error,
    textAlign: 'center',
    marginTop: 50,
  },
  purchaseTypeSection: {
    marginBottom: 24,
  },
  purchaseOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  purchaseOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  purchaseOptionSelected: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.primary,
  },
  purchaseOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  purchaseOptionTextSelected: {
    color: Colors.light.primary,
  },
  rollSection: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  rollQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.background,
  },
  rollQuantity: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    minWidth: 40,
    textAlign: 'center',
  },
  rollInfo: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  measurementSection: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  measurementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    marginBottom: 16,
  },
  measurementButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  calculatorResults: {
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalCalculation: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  modalCalculationText: {
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 4,
  },
  modalSaveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  roomTypeContainer: {
    marginTop: 8,
  },
  roomTypeChip: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roomTypeChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  roomTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  roomTypeTextSelected: {
    color: Colors.light.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: Colors.light.background,
  },
  saveModeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  saveModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  saveModeButtonSelected: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.primary,
  },
  saveModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  saveModeButtonTextSelected: {
    color: Colors.light.primary,
  },
  projectsList: {
    maxHeight: 300,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  projectItemSelected: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.primary,
  },
  projectItemContent: {
    flex: 1,
  },
  projectItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  projectItemRoom: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  projectItemWallpaper: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  emptyProjectsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyProjectsText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  createFirstProjectButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createFirstProjectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.background,
  },
});