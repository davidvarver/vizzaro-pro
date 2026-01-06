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
import { m2ToSqFt } from '@/utils/product';
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
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useCartStore } from '@/store/useCartStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { WallpaperOverlay } from '@/components/visualizer/WallpaperOverlay';

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
  const addToCart = useCartStore((s) => s.addToCart);
  const isInCart = useCartStore((s) => s.isInCart);
  const getWallpaperById = useWallpapersStore((s) => s.getWallpaperById);
  const getProjectById = useFavoritesStore((s) => s.getProjectById);
  const userRooms = useWallpapersStore((s) => s.userRooms);

  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState<boolean>(false);
  const [showWallpaperSelectorModal, setShowWallpaperSelectorModal] = useState<boolean>(false);
  // Default 10ft x 8ft
  const [wallLength, setWallLength] = useState<string>('10');
  const [wallHeight, setWallHeight] = useState<string>('8');
  const viewShotRef = useRef<ViewShot>(null);

  const project = projectId ? getProjectById(projectId) : null;
  const wallpaper = getWallpaperById(wallpaperId);

  // Mask Logic
  const currentRoom = userRooms.find(r => r.image === originalImage);
  const maskImage = currentRoom?.maskImage;
  const hasMask = !!maskImage;

  // Determine display mode
  // Helper for toggle text (Defined BEFORE use)
  const shouldShowOriginal = aiProcessingFailed === 'true' || showOriginal; // Defined first

  const shouldUseOverlay = !showOriginal && hasMask && (!processedImage || processedImage === '' || aiProcessingFailed === 'true');
  const currentImage = shouldShowOriginal ? originalImage : processedImage;

  const imageSource = { uri: `data:image/jpeg;base64,${shouldShowOriginal ? originalImage : processedImage}` };


  // Calculate wall area from length and height (Feet)
  const calculateWallArea = () => {
    const length = parseFloat(wallLength) || 0;
    const height = parseFloat(wallHeight) || 0;
    return length * height; // Sq Ft
  };

  const wallArea = calculateWallArea();

  if (!wallpaper || (!processedImage && !originalImage)) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error al cargar el resultado</Text>
      </View>
    );
  }

  const coverageSqFt = wallpaper.dimensions ? m2ToSqFt(wallpaper.dimensions.coverage) : 57;
  const rollsNeeded = Math.ceil(wallArea / coverageSqFt);
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
        `${rollsNeeded} roll${rollsNeeded > 1 ? 's' : ''} of "${wallpaper.name}" added to cart.`,
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
            encoding: 'base64',
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
        const cacheDir = (FileSystem as any).cacheDirectory || '';
        const fileUri = `${cacheDir}vizzaro-wallpaper-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, watermarkedBase64, {
          encoding: 'base64',
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
        const cacheDir = (FileSystem as any).cacheDirectory || '';
        const fileUri = `${cacheDir}vizzaro-wallpaper-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, watermarkedBase64, {
          encoding: 'base64',
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

            {shouldUseOverlay ? (
              <View style={{ width: '100%', height: 400 }}>
                <WallpaperOverlay
                  originalImage={originalImage}
                  maskImage={maskImage}
                  patternImage={wallpaper.imageUrl}
                  opacity={0.88}
                />
              </View>
            ) : (
              <Image source={imageSource} style={styles.resultImage} />
            )}

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
            <Text style={styles.detailLabel}>Price per roll:</Text>
            <Text style={styles.detailValue}>${wallpaper.price.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.detailRow, styles.editableRow]}
            onPress={() => setShowMeasurementModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailLabel}>Wall Dimensions:</Text>
            <View style={styles.measurementValue}>
              <Text style={styles.detailValue}>{wallLength}ft × {wallHeight}ft</Text>
              <Edit3 size={16} color={Colors.light.primary} />
            </View>
          </TouchableOpacity>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Area:</Text>
            <Text style={styles.detailValue}>{wallArea.toFixed(2)} sq ft</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rolls needed:</Text>
            <Text style={styles.detailValue}>{rollsNeeded} roll{rollsNeeded > 1 ? 's' : ''}</Text>
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
              <Text style={styles.modalTitle}>Wall Dimensions</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMeasurementModal(false)}
              >
                <X size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter your wall dimensions to calculate exactly how many rolls you need.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Wall Length (feet)</Text>
              <TextInput
                style={styles.input}
                value={wallLength}
                onChangeText={setWallLength}
                placeholder="Ex: 10"
                keyboardType="numeric"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Wall Height (feet)</Text>
              <TextInput
                style={styles.input}
                value={wallHeight}
                onChangeText={setWallHeight}
                placeholder="Ex: 8"
                keyboardType="numeric"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>

            <View style={styles.calculationResult}>
              <Calculator size={20} color={Colors.light.primary} />
              <Text style={styles.calculationText}>
                Total Area: {calculateWallArea().toFixed(2)} sq ft
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
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
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
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  calculationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  calculationText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.background,
  },
  wallpaperSelectorList: {
    maxHeight: 400,
  },
  wallpaperSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  wallpaperSelectorItemActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  wallpaperSelectorImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  wallpaperSelectorInfo: {
    flex: 1,
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
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 40,
  },
  editableRow: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: -8,
  },
  measurementValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  watermarkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  warningBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  warningText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
  },
});