import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Download,
  Share2,
  ShoppingCart,
  RotateCcw,
  CheckCircle,
  Edit3,
  X,
  Calculator,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import ViewShot from 'react-native-view-shot';
import Colors from '@/constants/colors';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';

export default function WallpaperResultScreen() {
  const { originalImage, processedImage, wallpaperId, aiProcessingFailed, isGenerated, errorMessage, projectId } = useLocalSearchParams<{
    originalImage: string;
    processedImage: string;
    wallpaperId: string;
    aiProcessingFailed?: string;
    isGenerated?: string;
    errorMessage?: string;
    projectId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { addToCart, isInCart } = useCart();
  const { getWallpaperById } = useWallpapers();
  const { getProjectById } = useFavorites();
  
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState<boolean>(false);
  const [showWallpaperSelectorModal, setShowWallpaperSelectorModal] = useState<boolean>(false);
  const [wallLength, setWallLength] = useState<string>('3');
  const [wallHeight, setWallHeight] = useState<string>('2.5');
  const viewShotRef = useRef<ViewShot>(null);
  
  const project = projectId ? getProjectById(projectId) : null;
  
  const wallpaper = getWallpaperById(wallpaperId);
  
  // Calculate wall area from length and height
  const calculateWallArea = () => {
    const length = parseFloat(wallLength) || 0;
    const height = parseFloat(wallHeight) || 0;
    return length * height;
  };
  
  const wallArea = calculateWallArea();
  
  if (!wallpaper || (!processedImage && !originalImage)) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error al cargar el resultado</Text>
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
    
    addToCart(wallpaper, rollsNeeded, wallArea);
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Agregado al Carrito',
        `${rollsNeeded} rollo${rollsNeeded > 1 ? 's' : ''} de "${wallpaper.name}" agregado${rollsNeeded > 1 ? 's' : ''} al carrito.`,
        [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Ver Carrito', onPress: () => router.push('/(tabs)/cart') },
        ]
      );
    }
  };

  const addWatermarkToImage = async (imageBase64: string): Promise<string> => {
    try {
      const imageUri = `data:image/jpeg;base64,${imageBase64}`;
      
      if (Platform.OS === 'web') {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            {
              resize: {
                width: 1200,
              },
            },
          ],
          {
            compress: 0.9,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              
              const watermarkText = 'www.vizzarowallpaper.com';
              const fontSize = Math.floor(img.width / 25);
              ctx.font = `bold ${fontSize}px Arial`;
              
              ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.lineWidth = 2;
              
              const textMetrics = ctx.measureText(watermarkText);
              const textWidth = textMetrics.width;
              const x = (canvas.width - textWidth) / 2;
              const y = canvas.height - fontSize - 20;
              
              ctx.strokeText(watermarkText, x, y);
              ctx.fillText(watermarkText, x, y);
              
              const watermarkedBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
              resolve(watermarkedBase64);
            } else {
              reject(new Error('Could not get canvas context'));
            }
          };
          img.onerror = reject;
          img.src = manipulatedImage.uri;
        });
      } else {
        if (viewShotRef.current && viewShotRef.current.capture) {
          const uri = await viewShotRef.current.capture();
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return base64;
        }
        return imageBase64;
      }
    } catch (error) {
      console.error('Error adding watermark:', error);
      return imageBase64;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const imageToSave = shouldShowOriginal ? originalImage : processedImage;
      
      if (Platform.OS === 'web') {
        const watermarkedBase64 = await addWatermarkToImage(imageToSave);
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${watermarkedBase64}`;
        link.download = `vizzaro-wallpaper-${Date.now()}.jpg`;
        link.click();
        Alert.alert('Éxito', 'Imagen guardada con marca de agua');
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso Denegado', 'Necesitamos permiso para guardar la imagen en tu galería.');
          return;
        }

        const watermarkedBase64 = await addWatermarkToImage(imageToSave);
        const fileUri = FileSystem.cacheDirectory + `vizzaro-wallpaper-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, watermarkedBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync('Vizzaro Wallpaper', asset, false);
        
        Alert.alert(
          'Imagen Guardada',
          'La imagen con marca de agua se ha guardado en tu galería.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'No se pudo guardar la imagen.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const imageToShare = shouldShowOriginal ? originalImage : processedImage;
      const watermarkedBase64 = await addWatermarkToImage(imageToShare);
      
      if (Platform.OS === 'web') {
        const blob = await (await fetch(`data:image/jpeg;base64,${watermarkedBase64}`)).blob();
        const file = new File([blob], 'vizzaro-wallpaper.jpg', { type: 'image/jpeg' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Vizzaro Wallpaper',
            text: 'Mira este papel tapiz de www.vizzarowallpaper.com',
          });
        } else {
          const link = document.createElement('a');
          link.href = `data:image/jpeg;base64,${watermarkedBase64}`;
          link.download = `vizzaro-wallpaper-${Date.now()}.jpg`;
          link.click();
          Alert.alert('Descargado', 'La imagen se ha descargado. Puedes compartirla desde tu carpeta de descargas.');
        }
      } else {
        const fileUri = FileSystem.cacheDirectory + `vizzaro-wallpaper-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, watermarkedBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Compartir imagen con marca de agua',
          });
        } else {
          Alert.alert('Error', 'No se puede compartir en este dispositivo');
        }
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'No se pudo compartir la imagen.');
    }
  };

  const handleTryAgain = () => {
    router.back();
  };

  const handleChangeWallpaper = (newWallpaperId: string) => {
    setShowWallpaperSelectorModal(false);
    router.replace({
      pathname: '/wallpaper-result',
      params: {
        originalImage,
        processedImage: originalImage,
        wallpaperId: newWallpaperId,
        aiProcessingFailed: 'true',
        projectId: projectId || '',
      }
    });
  };

  // If AI processing failed, always show original image, otherwise allow toggle
  const shouldShowOriginal = aiProcessingFailed === 'true' || showOriginal;
  const currentImage = shouldShowOriginal ? originalImage : processedImage;
  const imageSource = { uri: `data:image/jpeg;base64,${currentImage}` };

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
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Resultado</Text>
          <Text style={styles.headerSubtitle}>{wallpaper.name}</Text>
        </View>
        
        {aiProcessingFailed !== 'true' && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowOriginal(!showOriginal)}
          >
            <RotateCcw size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
          <View style={styles.imageContainer}>
            <Image source={imageSource} style={styles.resultImage} />
            
            <View style={styles.watermarkOverlay}>
              <Text style={styles.watermarkText}>www.vizzarowallpaper.com</Text>
            </View>
            
            <View style={styles.imageOverlay}>
              <View style={styles.toggleIndicator}>
                <Text style={styles.toggleText}>
                  {aiProcessingFailed === 'true' 
                    ? 'Tu Foto Original' 
                    : shouldShowOriginal 
                      ? 'Tu Foto' 
                      : isGenerated === 'true' 
                        ? 'Visualización IA' 
                        : 'Con Papel Tapiz'
                  }
                </Text>
              </View>
            </View>
          </View>
        </ViewShot>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownload}
            disabled={isDownloading}
          >
            <Download size={20} color={Colors.light.primary} />
            <Text style={styles.actionButtonText}>
              {isDownloading ? 'Guardando...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Share2 size={20} color={Colors.light.primary} />
            <Text style={styles.actionButtonText}>Compartir</Text>
          </TouchableOpacity>
          
          {project && project.wallpapers.length > 1 ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowWallpaperSelectorModal(true)}
            >
              <RotateCcw size={20} color={Colors.light.primary} />
              <Text style={styles.actionButtonText}>Cambiar Papel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleTryAgain}
            >
              <RotateCcw size={20} color={Colors.light.primary} />
              <Text style={styles.actionButtonText}>Intentar de Nuevo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.resultInfo}>
          {aiProcessingFailed === 'true' ? (
            <View style={styles.warningBadge}>
              <Text style={styles.warningText}>⚠️ {errorMessage || 'Procesamiento de IA no disponible'}</Text>
            </View>
          ) : (
            <View style={styles.successBadge}>
              <CheckCircle size={20} color={Colors.light.success} />
              <Text style={styles.successText}>
                {isGenerated === 'true' ? '¡Visualización generada exitosamente!' : '¡Papel tapiz aplicado exitosamente!'}
              </Text>
            </View>
          )}
          
          <Text style={styles.resultDescription}>
            {aiProcessingFailed === 'true' 
              ? `Esta es tu imagen original. ${errorMessage || 'El servicio de IA está temporalmente no disponible'}, pero puedes usar esta imagen como referencia para visualizar cómo se vería el papel tapiz "${wallpaper.name}" en tu pared.`
              : isGenerated === 'true'
                ? `La IA ha generado una visualización profesional mostrando cómo se vería el papel tapiz "${wallpaper.name}" en un ambiente real. Esta imagen te da una idea clara del estilo y los colores en un contexto de hogar.`
                : `La IA ha detectado automáticamente las paredes en tu imagen y ha aplicado el papel tapiz "${wallpaper.name}" de manera realista, respetando la perspectiva y la iluminación natural.`
            }
          </Text>
        </View>

        <View style={styles.wallpaperDetails}>
          <Text style={styles.sectionTitle}>Detalles del Papel Tapiz</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nombre:</Text>
            <Text style={styles.detailValue}>{wallpaper.name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estilo:</Text>
            <Text style={styles.detailValue}>{wallpaper.style}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Precio por rollo:</Text>
            <Text style={styles.detailValue}>${wallpaper.price.toFixed(2)}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.detailRow, styles.editableRow]}
            onPress={() => setShowMeasurementModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailLabel}>Medidas de la pared:</Text>
            <View style={styles.measurementValue}>
              <Text style={styles.detailValue}>{wallLength}m × {wallHeight}m</Text>
              <Edit3 size={16} color={Colors.light.primary} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Área total:</Text>
            <Text style={styles.detailValue}>{wallArea.toFixed(2)} m²</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rollos necesarios:</Text>
            <Text style={styles.detailValue}>{rollsNeeded} rollo{rollsNeeded > 1 ? 's' : ''}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total estimado:</Text>
            <Text style={[styles.detailValue, styles.totalPrice]}>${totalPrice.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
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
                ? 'Agregar Más al Carrito' 
                : 'Agregar al Carrito'
            }
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Measurement Modal */}
      <Modal
        visible={showMeasurementModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMeasurementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Medidas de la Pared</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMeasurementModal(false)}
              >
                <X size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Ingresa las medidas de tu pared para calcular exactamente cuántos rollos necesitas.
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Largo de la pared (metros)</Text>
              <TextInput
                style={styles.input}
                value={wallLength}
                onChangeText={setWallLength}
                placeholder="Ej: 3.5"
                keyboardType="numeric"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Alto de la pared (metros)</Text>
              <TextInput
                style={styles.input}
                value={wallHeight}
                onChangeText={setWallHeight}
                placeholder="Ej: 2.5"
                keyboardType="numeric"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
            
            <View style={styles.calculationResult}>
              <Calculator size={20} color={Colors.light.primary} />
              <Text style={styles.calculationText}>
                Área total: {calculateWallArea().toFixed(2)} m²
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMeasurementModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setShowMeasurementModal(false)}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Wallpaper Selector Modal */}
      {project && (
        <Modal
          visible={showWallpaperSelectorModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowWallpaperSelectorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cambiar Papel Tapiz</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowWallpaperSelectorModal(false)}
                >
                  <X size={24} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDescription}>
                Selecciona otro papel tapiz del proyecto &quot;{project.name}&quot; para visualizar con la misma foto.
              </Text>
              
              <ScrollView style={styles.wallpaperSelectorList}>
                {project.wallpapers.map((wp) => (
                  <TouchableOpacity
                    key={wp.id}
                    style={[
                      styles.wallpaperSelectorItem,
                      wp.id === wallpaperId && styles.wallpaperSelectorItemActive
                    ]}
                    onPress={() => handleChangeWallpaper(wp.id)}
                    disabled={wp.id === wallpaperId}
                  >
                    <Image
                      source={{ uri: wp.imageUrl }}
                      style={styles.wallpaperSelectorImage}
                    />
                    <View style={styles.wallpaperSelectorInfo}>
                      <Text style={styles.wallpaperSelectorName}>{wp.name}</Text>
                      <Text style={styles.wallpaperSelectorCategory}>{wp.category}</Text>
                      <Text style={styles.wallpaperSelectorPrice}>${wp.price}</Text>
                    </View>
                    {wp.id === wallpaperId && (
                      <View style={styles.activeIndicator}>
                        <Check size={20} color={Colors.light.background} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  resultImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resultInfo: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.success,
  },
  successText: {
    color: Colors.light.success,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultDescription: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  wallpaperDetails: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalPrice: {
    color: Colors.light.primary,
    fontSize: 18,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  addToCartButton: {
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
  measurementValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  calculationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  calculationText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  editableRow: {
    backgroundColor: Colors.light.backgroundSecondary,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  wallpaperSelectorList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  wallpaperSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wallpaperSelectorItemActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  wallpaperSelectorImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  wallpaperSelectorInfo: {
    flex: 1,
    gap: 2,
  },
  wallpaperSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  wallpaperSelectorCategory: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  wallpaperSelectorPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  activeIndicator: {
    backgroundColor: Colors.light.primary,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});