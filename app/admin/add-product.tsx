import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Save,
  X,
  Plus,
  Link as LinkIcon,
  Upload,
  Download,
  FileSpreadsheet,
  Palette,
  Home,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import Colors from '@/constants/colors';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useWallpapers } from '@/contexts/WallpapersContext';
import { useAuth } from '@/contexts/AuthContext';
import { Wallpaper } from '@/constants/wallpapers';
import AdminGuard from '@/components/AdminGuard';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  style: string;
  colors: string[];
  width: string;
  height: string;
  coverage: string;
  weight: string;
  imageUri: string;
  imageUris: string[];
  showInHome: boolean;
}

export default function AddProductScreen() {
  const { addWallpaper, addMultipleWallpapers, replaceAllWallpapers } = useWallpapers();
  const { token } = useAuth();
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    category: '',
    style: '',
    colors: [],
    width: '',
    height: '',
    coverage: '',
    weight: '',
    imageUri: '',
    imageUris: [],
    showInHome: false,
  });
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [colorInput, setColorInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkUrls, setBulkUrls] = useState<string>('');
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);
  const [excelReplaceMode, setExcelReplaceMode] = useState<boolean>(true);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showStyleModal, setShowStyleModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newStyleName, setNewStyleName] = useState<string>('');
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  const [styles_options, setStylesOptions] = useState<string[]>([
    'Elegante',
    'Moderno',
    'Clásico',
    'Minimalista',
    'Vintage',
    'Contemporáneo',
    'Rústico',
    'Bohemio',
  ]);

  const updateForm = (field: keyof ProductForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // --- Image Upload Logic ---

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadImage(asset);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setUploading(true);

      const filename = asset.fileName || 'upload.jpg';
      let body: any;

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        body = blob;
      } else {
        // For native, we need to send binary data. 
        // Vercel Blob 'put' expects body. 
        // Our API endpoint expects body content.
        // Sending base64 as body if API handles it, or use FileSystem to read as string.
        // Simplified approach: Send base64 and handle in API or assume Web usage for Admin.
        // Given current context, let's assume web admin predominantly or basic fetch.
        // Actually, on generic fetch in RN, passing 'uri' to body doesn't work like web.
        // We need to read file.
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        body = base64; // This puts base64 string as body. API needs to handle.
        // Wait, 'put' expects the file content. 
        // If we send base64 string, the file will be that text.
        // We'd need to decode on server. 
        // Let's stick to Web support primarily for this task as it's the requested path 
        // and usually admin panels are web-based.
        Alert.alert('Aviso', 'La subida de archivos está optimizada para Web. En móvil puede requerir ajustes.');
        return;
      }

      const uploadRes = await fetch(`/api/upload?filename=${filename}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: body
      });

      if (uploadRes.ok) {
        const data = await uploadRes.json();
        // data.url is the new blob url
        if (data.url) {
          setImageUrlInput(data.url);
        }
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const addImageUrl = () => {
    console.log('Agregando imagen URL:', imageUrlInput);

    if (!imageUrlInput.trim()) {
      Alert.alert('Error', 'Por favor ingresa una URL válida');
      return;
    }

    if (form.imageUris.includes(imageUrlInput.trim())) {
      Alert.alert('Error', 'Esta imagen ya fue agregada');
      return;
    }

    const newImageUrl = imageUrlInput.trim();
    setForm(prev => {
      const newImageUris = [...prev.imageUris, newImageUrl];
      console.log('Imágenes actualizadas:', newImageUris);
      return {
        ...prev,
        imageUri: prev.imageUri || newImageUrl,
        imageUris: newImageUris
      };
    });
    setImageUrlInput('');
    Alert.alert('Éxito', 'Imagen agregada correctamente');
  };

  const processBulkUrls = () => {
    if (!bulkUrls.trim()) {
      Alert.alert('Error', 'Por favor ingresa al menos una URL');
      return;
    }

    const urls = bulkUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      Alert.alert('Error', 'No se encontraron URLs válidas');
      return;
    }

    const uniqueUrls = urls.filter(url => !form.imageUris.includes(url));

    if (uniqueUrls.length === 0) {
      Alert.alert('Error', 'Todas las URLs ya fueron agregadas');
      return;
    }

    setForm(prev => {
      const newImageUris = [...prev.imageUris, ...uniqueUrls];
      return {
        ...prev,
        imageUri: prev.imageUri || uniqueUrls[0],
        imageUris: newImageUris
      };
    });

    setBulkUrls('');
    setShowBulkModal(false);
    Alert.alert('Éxito', `${uniqueUrls.length} imagen(es) agregada(s) correctamente`);
  };

  const removeImage = (indexToRemove?: number) => {
    if (indexToRemove !== undefined) {
      // Remove specific image from array
      setForm(prev => {
        const newImageUris = prev.imageUris.filter((_, index) => index !== indexToRemove);
        return {
          ...prev,
          imageUris: newImageUris,
          imageUri: newImageUris.length > 0 ? newImageUris[0] : ''
        };
      });
    } else {
      // Remove all images
      updateForm('imageUri', '');
      setForm(prev => ({ ...prev, imageUris: [] }));
    }
  };

  const validateForm = (): boolean => {
    console.log('Validando formulario:', form);

    if (!form.name.trim()) {
      console.log('Error: Nombre vacío');
      Alert.alert('Error', 'El nombre del producto es obligatorio');
      return false;
    }
    if (!form.description.trim()) {
      console.log('Error: Descripción vacía');
      Alert.alert('Error', 'La descripción es obligatoria');
      return false;
    }
    if (!form.price.trim() || isNaN(Number(form.price))) {
      console.log('Error: Precio inválido:', form.price);
      Alert.alert('Error', 'El precio debe ser un número válido');
      return false;
    }
    if (!form.category.trim()) {
      console.log('Error: Categoría vacía');
      Alert.alert('Error', 'La categoría es obligatoria');
      return false;
    }
    if (!form.style.trim()) {
      console.log('Error: Estilo vacío');
      Alert.alert('Error', 'El estilo es obligatorio');
      return false;
    }
    if (!form.colors || form.colors.length === 0) {
      console.log('Error: Sin colores');
      Alert.alert('Error', 'Debe agregar al menos un color');
      return false;
    }
    if (!form.width.trim() || isNaN(Number(form.width))) {
      console.log('Error: Ancho inválido:', form.width);
      Alert.alert('Error', 'El ancho debe ser un número válido');
      return false;
    }
    if (!form.height.trim() || isNaN(Number(form.height))) {
      console.log('Error: Altura inválida:', form.height);
      Alert.alert('Error', 'La altura debe ser un número válido');
      return false;
    }
    if (!form.coverage.trim() || isNaN(Number(form.coverage))) {
      console.log('Error: Cobertura inválida:', form.coverage);
      Alert.alert('Error', 'La cobertura debe ser un número válido');
      return false;
    }
    if (form.weight.trim() && isNaN(Number(form.weight))) {
      console.log('Error: Peso inválido:', form.weight);
      Alert.alert('Error', 'El peso debe ser un número válido');
      return false;
    }
    if (form.imageUris.length === 0) {
      console.log('Error: No hay imágenes');
      Alert.alert('Error', 'Al menos una imagen del producto es obligatoria');
      return false;
    }

    console.log('Formulario válido');
    return true;
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
    updateForm('category', newCategory);
    setNewCategoryName('');
    setShowCategoryModal(false);
    Alert.alert('Éxito', `Categoría "${newCategory}" agregada correctamente`);
  };

  const addNewStyle = () => {
    if (!newStyleName.trim()) {
      Alert.alert('Error', 'El nombre del estilo no puede estar vacío');
      return;
    }

    if (styles_options.includes(newStyleName.trim())) {
      Alert.alert('Error', 'Este estilo ya existe');
      return;
    }

    const newStyle = newStyleName.trim();
    setStylesOptions(prev => [...prev, newStyle]);
    updateForm('style', newStyle);
    setNewStyleName('');
    setShowStyleModal(false);
    Alert.alert('Éxito', `Estilo "${newStyle}" agregado correctamente`);
  };

  const saveProduct = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const newProduct = {
        id: Date.now().toString(),
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        style: form.style,
        colors: form.colors,
        dimensions: {
          width: Number(form.width),
          height: Number(form.height),
          coverage: Number(form.coverage),
          weight: form.weight.trim() ? Number(form.weight) : undefined,
        },
        specifications: {
          material: 'Vinilo',
          washable: true,
          removable: true,
          textured: false,
        },
        imageUrl: form.imageUris[0] || form.imageUri,
        imageUrls: form.imageUris,
        inStock: true,
        rating: 0,
        reviews: 0,
        showInHome: form.showInHome,
      };

      console.log('Guardando nuevo producto:', newProduct);

      if (!token) {
        throw new Error('No hay token de administrador');
      }

      const success = await addWallpaper(newProduct, token);

      if (success) {
        console.log('Producto guardado exitosamente');
        router.back();
      } else {
        throw new Error('No se pudo guardar el producto');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'No se pudo guardar el producto. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcelTemplate = async () => {
    try {
      console.log('[Excel] Starting template download...');

      const templateData = [
        {
          'Nombre': 'Ejemplo Papel Tapiz',
          'Descripción': 'Descripción detallada del producto',
          'Precio': 45.99,
          'Categoría': 'Floral',
          'Estilo': 'Moderno',
          'Ancho (m)': 0.53,
          'Altura (m)': 10.05,
          'Cobertura (m²)': 5.33,
          'Peso (kg)': 2.5,
          'URL Imagen 1': 'https://ejemplo.com/imagen1.jpg',
          'URL Imagen 2': 'https://ejemplo.com/imagen2.jpg',
          'URL Imagen 3': 'https://ejemplo.com/imagen3.jpg',
          'URL Imagen 4': 'https://ejemplo.com/imagen4.jpg',
        }
      ];

      console.log('[Excel] Creating worksheet...');
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');

      console.log('[Excel] Platform:', Platform.OS);

      if (Platform.OS === 'web') {
        console.log('[Excel] Generating file for web...');
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

        console.log('[Excel] Creating blob...');
        const blob = new Blob(
          [wbout],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        );

        console.log('[Excel] Creating download link...');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_productos.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('[Excel] Download triggered successfully');
        if (Platform.OS !== 'web') {
          Alert.alert('Éxito', 'Plantilla descargada correctamente');
        }
      } else {
        console.log('[Excel] Generating file for mobile...');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

        const docDir = (FileSystem as any).documentDirectory || '';
        const fileUri = `${docDir}plantilla_productos.xlsx`;
        console.log('[Excel] Writing to:', fileUri);

        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: 'base64',
        });

        console.log('[Excel] Sharing file...');
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Guardar plantilla',
          UTI: 'com.microsoft.excel.xlsx',
        });

        console.log('[Excel] File shared successfully');
      }
    } catch (error) {
      console.error('[Excel] Error downloading template:', error);
      console.error('[Excel] Error details:', error instanceof Error ? error.message : String(error));
      Alert.alert('Error', 'No se pudo descargar la plantilla: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const uploadExcelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setIsLoading(true);
      const fileUri = result.assets[0].uri;

      let fileContent: string;
      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        await processExcelData(jsonData);
      } else {
        fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        await processExcelData(jsonData);
      }
    } catch (error) {
      console.error('Error uploading Excel:', error);
      Alert.alert('Error', 'No se pudo procesar el archivo Excel');
    } finally {
      setIsLoading(false);
    }
  };

  const processExcelData = async (data: any[]) => {
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const productsToAdd: Wallpaper[] = [];

      console.log('Procesando', data.length, 'filas del Excel');

      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        try {
          const imageUrls: string[] = [];
          const imageUrl1 = row['URL Imagen 1'] || row['url imagen 1'] || row['URL_Imagen_1'];
          const imageUrl2 = row['URL Imagen 2'] || row['url imagen 2'] || row['URL_Imagen_2'];
          const imageUrl3 = row['URL Imagen 3'] || row['url imagen 3'] || row['URL_Imagen_3'];
          const imageUrl4 = row['URL Imagen 4'] || row['url imagen 4'] || row['URL_Imagen_4'];

          if (imageUrl1 && String(imageUrl1).trim()) imageUrls.push(String(imageUrl1).trim());
          if (imageUrl2 && String(imageUrl2).trim()) imageUrls.push(String(imageUrl2).trim());
          if (imageUrl3 && String(imageUrl3).trim()) imageUrls.push(String(imageUrl3).trim());
          if (imageUrl4 && String(imageUrl4).trim()) imageUrls.push(String(imageUrl4).trim());

          const name = row['Nombre'] || row['nombre'];
          const description = row['Descripción'] || row['Descripcion'] || row['descripción'] || row['descripcion'];
          const priceRaw = row['Precio'] || row['precio'];

          console.log(`[Excel] Fila ${i + 2}:`, { name, description, priceRaw, imageCount: imageUrls.length });

          if (!name || !String(name).trim()) {
            errors.push(`Fila ${i + 2}: Falta el nombre del producto`);
            errorCount++;
            continue;
          }

          if (!description || !String(description).trim()) {
            errors.push(`Fila ${i + 2}: Falta la descripción del producto`);
            errorCount++;
            continue;
          }

          if (priceRaw === undefined || priceRaw === null || priceRaw === '') {
            errors.push(`Fila ${i + 2}: Falta el precio del producto`);
            errorCount++;
            continue;
          }

          const price = Number(priceRaw);
          if (isNaN(price) || price < 0) {
            errors.push(`Fila ${i + 2}: Precio inválido (${priceRaw})`);
            errorCount++;
            continue;
          }

          if (imageUrls.length === 0) {
            errors.push(`Fila ${i + 2}: Falta al menos una URL de imagen`);
            errorCount++;
            continue;
          }

          const category = row['Categoría'] || row['Categoria'] || row['categoría'] || row['categoria'] || 'General';
          const style = row['Estilo'] || row['estilo'] || 'Moderno';
          const widthRaw = row['Ancho (m)'] || row['ancho (m)'] || row['Ancho'] || row['ancho'];
          const heightRaw = row['Altura (m)'] || row['altura (m)'] || row['Altura'] || row['altura'];
          const coverageRaw = row['Cobertura (m²)'] || row['cobertura (m²)'] || row['Cobertura'] || row['cobertura'];
          const weightRaw = row['Peso (kg)'] || row['peso (kg)'] || row['Peso'] || row['peso'];

          const width = widthRaw !== undefined && widthRaw !== null && widthRaw !== '' ? Number(widthRaw) : 0.53;
          const height = heightRaw !== undefined && heightRaw !== null && heightRaw !== '' ? Number(heightRaw) : 10.05;
          const coverage = coverageRaw !== undefined && coverageRaw !== null && coverageRaw !== '' ? Number(coverageRaw) : 5.33;
          const weight = weightRaw !== undefined && weightRaw !== null && weightRaw !== '' ? Number(weightRaw) : undefined;

          if (isNaN(width) || width <= 0) {
            console.warn(`[Excel] Fila ${i + 2}: Ancho inválido (${widthRaw}), usando 0.53`);
          }
          if (isNaN(height) || height <= 0) {
            console.warn(`[Excel] Fila ${i + 2}: Altura inválida (${heightRaw}), usando 10.05`);
          }
          if (isNaN(coverage) || coverage <= 0) {
            console.warn(`[Excel] Fila ${i + 2}: Cobertura inválida (${coverageRaw}), usando 5.33`);
          }

          const newProduct: Wallpaper = {
            id: Date.now().toString() + '_' + i + '_' + Math.random().toString(36).substr(2, 9),
            name: String(name).trim(),
            description: String(description).trim(),
            price,
            category: String(category).trim(),
            style: String(style).trim(),
            colors: [],
            dimensions: {
              width: isNaN(width) || width <= 0 ? 0.53 : width,
              height: isNaN(height) || height <= 0 ? 10.05 : height,
              coverage: isNaN(coverage) || coverage <= 0 ? 5.33 : coverage,
              weight: weight !== undefined && !isNaN(weight) && weight > 0 ? weight : undefined,
            },
            specifications: {
              material: 'Vinilo',
              washable: true,
              removable: true,
              textured: false,
            },
            imageUrl: imageUrls[0],
            imageUrls: imageUrls,
            inStock: true,
            rating: 0,
            reviews: 0,
            showInHome: false,
          };

          console.log(`[Excel] Producto creado para fila ${i + 2}:`, { id: newProduct.id, name: newProduct.name, price: newProduct.price });

          productsToAdd.push(newProduct);
          successCount++;
        } catch (error) {
          errors.push(`Fila ${i + 2}: ${error}`);
          errorCount++;
        }
      }

      console.log('Productos válidos a agregar:', productsToAdd.length);

      if (productsToAdd.length > 0) {
        if (!token) {
          throw new Error('No hay token de administrador');
        }

        const success = excelReplaceMode
          ? await replaceAllWallpapers(productsToAdd, token)
          : await addMultipleWallpapers(productsToAdd, token);

        if (!success) {
          throw new Error('Error al agregar productos');
        }
        console.log(excelReplaceMode ? 'Catálogo reemplazado completamente' : 'Todos los productos fueron agregados');
      }

      setShowExcelModal(false);

      const mode = excelReplaceMode ? 'reemplazado' : 'agregado(s)';
      let message = `${successCount} producto(s) ${mode} correctamente`;
      if (errorCount > 0) {
        message += `\n${errorCount} error(es):\n${errors.slice(0, 3).join('\n')}`;
        if (errors.length > 3) {
          message += `\n... y ${errors.length - 3} más`;
        }
      }

      Alert.alert(
        successCount > 0 ? 'Carga completada' : 'Error',
        message,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error processing Excel data:', error);
      Alert.alert('Error', 'No se pudo procesar los datos del Excel');
    }
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
          <Text style={styles.headerTitle}>Agregar Producto</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.excelButton}
              onPress={() => setShowExcelModal(true)}
            >
              <FileSpreadsheet size={20} color={Colors.light.tint} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={saveProduct}
              disabled={isLoading}
            >
              <Save size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Imágenes del producto */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Imágenes del producto *</Text>
              <TouchableOpacity
                style={styles.bulkButton}
                onPress={() => setShowBulkModal(true)}
              >
                <Upload size={16} color={Colors.light.tint} />
                <Text style={styles.bulkButtonText}>Masivo</Text>
              </TouchableOpacity>
            </View>

            {/* Input para agregar URL de imagen */}
            {/* Input para agregar URL de imagen o subir archivo */}
            <View style={styles.urlInputContainer}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="https://ejemplo.com/imagen.jpg"
                value={imageUrlInput}
                onChangeText={setImageUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.addUrlButton, uploading && { opacity: 0.5, backgroundColor: Colors.light.tabIconDefault }]}
                onPress={pickImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Upload size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addUrlButton}
                onPress={addImageUrl}
                disabled={!imageUrlInput.trim()}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Pre-add Preview */}
            {imageUrlInput.trim().length > 10 && (
              <View style={styles.urlPreviewContainer}>
                <Text style={styles.previewLabel}>Vista previa:</Text>
                <Image
                  source={{ uri: imageUrlInput }}
                  style={styles.urlPreviewImage}
                  resizeMode="contain"
                  onError={() => console.log('Error loading preview')}
                />
              </View>
            )}

            {/* Lista de imágenes */}
            {form.imageUris.length > 0 ? (
              <View style={styles.imageUrlsList}>
                {form.imageUris.map((imageUri, index) => (
                  <View key={index} style={styles.imageUrlItem}>
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    </View>
                    <View style={styles.imageUrlInfo}>
                      <Text style={styles.imageUrlText} numberOfLines={1}>
                        {imageUri}
                      </Text>
                      {index === 0 && (
                        <Text style={styles.mainImageLabel}>Principal</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeUrlButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noImagesPlaceholder}>
                <LinkIcon size={32} color={Colors.light.tabIconDefault} />
                <Text style={styles.noImagesText}>
                  No hay imágenes agregadas
                </Text>
                <Text style={styles.noImagesHint}>
                  Agrega URLs de imágenes desde internet
                </Text>
              </View>
            )}
          </View>

          {/* Información básica */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información básica</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del producto *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Papel Tapiz Floral Elegante"
                value={form.name}
                onChangeText={(value) => updateForm('name', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe las características y detalles del producto..."
                value={form.description}
                onChangeText={(value) => updateForm('description', value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Precio (MXN) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                value={form.price}
                onChangeText={(value) => updateForm('price', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Categorización */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categorización</Text>

            <View style={styles.inputGroup}>
              <View style={styles.labelWithButton}>
                <Text style={styles.inputLabel}>Categoría *</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Plus size={16} color={Colors.light.tint} />
                  <Text style={styles.addButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipContainer}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.chip,
                      form.category === category && styles.chipSelected
                    ]}
                    onPress={() => updateForm('category', category)}
                  >
                    <Text style={[
                      styles.chipText,
                      form.category === category && styles.chipTextSelected
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelWithButton}>
                <Text style={styles.inputLabel}>Estilo *</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowStyleModal(true)}
                >
                  <Plus size={16} color={Colors.light.tint} />
                  <Text style={styles.addButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipContainer}
              >
                {styles_options.map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.chip,
                      form.style === style && styles.chipSelected
                    ]}
                    onPress={() => updateForm('style', style)}
                  >
                    <Text style={[
                      styles.chipText,
                      form.style === style && styles.chipTextSelected
                    ]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Colores */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Colores disponibles</Text>

            <View style={styles.urlInputContainer}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Ej: Blanco, Gris, Azul"
                value={colorInput}
                onChangeText={setColorInput}
              />
              <TouchableOpacity
                style={styles.addUrlButton}
                onPress={() => {
                  if (colorInput.trim() && !form.colors.includes(colorInput.trim())) {
                    setForm(prev => ({ ...prev, colors: [...prev.colors, colorInput.trim()] }));
                    setColorInput('');
                  } else if (form.colors.includes(colorInput.trim())) {
                    Alert.alert('Error', 'Este color ya fue agregado');
                  }
                }}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {form.colors.length > 0 ? (
              <View style={styles.imageUrlsList}>
                {form.colors.map((color, index) => (
                  <View key={index} style={styles.imageUrlItem}>
                    <View style={styles.imageUrlInfo}>
                      <Text style={styles.imageUrlText}>{color}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeUrlButton}
                      onPress={() => {
                        setForm(prev => ({ ...prev, colors: prev.colors.filter((_, i) => i !== index) }));
                      }}
                    >
                      <X size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noImagesPlaceholder}>
                <Palette size={32} color={Colors.light.tabIconDefault} />
                <Text style={styles.noImagesText}>
                  No hay colores agregados
                </Text>
                <Text style={styles.noImagesHint}>
                  Agrega los colores disponibles para este papel tapiz
                </Text>
              </View>
            )}
          </View>

          {/* Especificaciones técnicas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Especificaciones técnicas</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Ancho (m) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.53"
                  value={form.width}
                  onChangeText={(value) => updateForm('width', value)}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Altura (m) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="10.05"
                  value={form.height}
                  onChangeText={(value) => updateForm('height', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cobertura por rollo (m²) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="5.33"
                value={form.coverage}
                onChangeText={(value) => updateForm('coverage', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Peso por rollo (kg)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="2.5"
                value={form.weight}
                onChangeText={(value) => updateForm('weight', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Visibilidad en Home */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Visibilidad</Text>
              <Home size={20} color={Colors.light.tint} />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.inputLabel}>Mostrar en home</Text>
                <Text style={styles.switchDescription}>
                  Este producto aparecerá en la pantalla principal
                </Text>
              </View>
              <Switch
                value={form.showInHome}
                onValueChange={(value) => setForm(prev => ({ ...prev, showInHome: value }))}
                trackColor={{ false: Colors.light.tabIconDefault, true: Colors.light.tint }}
                thumbColor={form.showInHome ? Colors.light.background : Colors.light.background}
              />
            </View>
          </View>

          {/* Ayuda */}
          <View style={styles.whatsappSection}>
            <Text style={styles.whatsappTitle}>¿Necesitas ayuda?</Text>
            <WhatsAppButton
              message="Hola, necesito ayuda para agregar productos al catálogo"
              style="secondary"
              size="medium"
            />
          </View>
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

        {/* Modal para agregar URLs masivamente */}
        <Modal
          visible={showBulkModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBulkModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Agregar Imágenes Masivamente</Text>
              <Text style={styles.modalSubtitle}>
                Ingresa una URL por línea
              </Text>

              <TextInput
                style={[styles.modalInput, styles.bulkTextArea]}
                placeholder="https://ejemplo.com/imagen1.jpg&#10;https://ejemplo.com/imagen2.jpg&#10;https://ejemplo.com/imagen3.jpg"
                value={bulkUrls}
                onChangeText={setBulkUrls}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowBulkModal(false);
                    setBulkUrls('');
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={processBulkUrls}
                >
                  <Text style={styles.modalButtonTextConfirm}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para carga masiva con Excel */}
        <Modal
          visible={showExcelModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExcelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Carga Masiva con Excel</Text>
              <Text style={styles.modalSubtitle}>
                Descarga la plantilla, llénala con tus productos y súbela
              </Text>

              <View style={styles.excelActions}>
                <TouchableOpacity
                  style={styles.excelActionButton}
                  onPress={downloadExcelTemplate}
                >
                  <Download size={24} color={Colors.light.tint} />
                  <Text style={styles.excelActionTitle}>Descargar Plantilla</Text>
                  <Text style={styles.excelActionSubtitle}>
                    Archivo Excel con formato
                  </Text>
                </TouchableOpacity>

                <View style={styles.excelDivider} />

                <TouchableOpacity
                  style={styles.excelActionButton}
                  onPress={uploadExcelFile}
                >
                  <Upload size={24} color={Colors.light.tint} />
                  <Text style={styles.excelActionTitle}>Subir Excel</Text>
                  <Text style={styles.excelActionSubtitle}>
                    Cargar productos masivamente
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.replaceModeContainer}>
                <TouchableOpacity
                  style={styles.replaceModeOption}
                  onPress={() => setExcelReplaceMode(false)}
                >
                  <View style={[
                    styles.radioButton,
                    !excelReplaceMode && styles.radioButtonSelected
                  ]}>
                    {!excelReplaceMode && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.replaceModeText}>
                    <Text style={styles.replaceModeTitle}>Agregar al catálogo</Text>
                    <Text style={styles.replaceModeSubtitle}>Mantiene productos existentes</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.replaceModeOption}
                  onPress={() => setExcelReplaceMode(true)}
                >
                  <View style={[
                    styles.radioButton,
                    excelReplaceMode && styles.radioButtonSelected
                  ]}>
                    {excelReplaceMode && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.replaceModeText}>
                    <Text style={styles.replaceModeTitle}>Reemplazar catálogo</Text>
                    <Text style={styles.replaceModeSubtitle}>Elimina todos los productos actuales</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 16 }]}
                onPress={() => setShowExcelModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color={Colors.light.tint} />
              <Text style={styles.loadingText}>Guardando producto...</Text>
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  excelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  imageWrapper: {
    position: 'relative',
  },
  productImage: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
    borderRadius: 8,
    marginRight: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  imagePlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    fontWeight: '500',
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
  textInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  chipContainer: {
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  whatsappSection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  whatsappTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  urlInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addUrlButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUrlsList: {
    gap: 12,
  },
  imageUrlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 12,
    gap: 12,
  },
  imagePreviewContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.light.background,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageUrlInfo: {
    flex: 1,
    gap: 4,
  },
  imageUrlText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  mainImageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  removeUrlButton: {
    padding: 4,
  },
  noImagesPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingVertical: 32,
    gap: 8,
  },
  noImagesText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    fontWeight: '500',
  },
  noImagesHint: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bulkButton: {
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
  bulkButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    marginBottom: 16,
  },
  bulkTextArea: {
    height: 150,
    paddingTop: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  excelActions: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 16,
  },
  excelActionButton: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  excelActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  excelActionSubtitle: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
  },
  excelDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
  },
  replaceModeContainer: {
    marginTop: 16,
    gap: 12,
  },
  replaceModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.light.tint,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.tint,
  },
  replaceModeText: {
    flex: 1,
  },
  replaceModeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  replaceModeSubtitle: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  noImagesHint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  urlPreviewContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  urlPreviewImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 4,
  },
});
