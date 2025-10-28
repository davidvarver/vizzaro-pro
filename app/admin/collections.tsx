import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react-native';
import { useCollections, Collection } from '@/contexts/CollectionsContext';
import Colors from '@/constants/colors';

export default function AdminCollections() {
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { collections, addCollection, updateCollection, deleteCollection } = useCollections();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<Collection>({
    id: '',
    name: '',
    image: '',
    colors: [],
    featured: false,
  });

  const handleAddNew = () => {
    setFormData({
      id: `collection-${Date.now()}`,
      name: '',
      image: '',
      colors: [],
      featured: false,
    });
    setEditingCollection(null);
    setIsModalVisible(true);
  };

  const handleEdit = (collection: Collection) => {
    setFormData({ ...collection });
    setEditingCollection(collection);
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre de la colección es obligatorio');
      return;
    }

    if (!formData.image.trim()) {
      Alert.alert('Error', 'La URL de la imagen es obligatoria');
      return;
    }

    if (formData.colors.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un color');
      return;
    }

    setIsSaving(true);
    try {
      const token = process.env.EXPO_PUBLIC_ADMIN_TOKEN || 'vizzaro_admin_secret_2025';
      
      if (editingCollection) {
        await updateCollection(formData, token);
        Alert.alert('Éxito', 'Colección actualizada exitosamente');
      } else {
        await addCollection(formData, token);
        Alert.alert('Éxito', 'Colección agregada exitosamente');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving collection:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al guardar la colección');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (collection: Collection) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que deseas eliminar "${collection.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = process.env.EXPO_PUBLIC_ADMIN_TOKEN || 'vizzaro_admin_secret_2025';
              await deleteCollection(collection.id, token);
              Alert.alert('Éxito', 'Colección eliminada exitosamente');
            } catch (error) {
              console.error('Error deleting collection:', error);
              Alert.alert('Error', 'Error al eliminar la colección');
            }
          },
        },
      ]
    );
  };

  const addColor = () => {
    Alert.prompt(
      'Agregar color',
      'Ingresa el nombre del color',
      (text) => {
        if (text?.trim()) {
          setFormData({
            ...formData,
            colors: [...formData.colors, text.trim()],
          });
        }
      }
    );
  };

  const removeColor = (index: number) => {
    setFormData({
      ...formData,
      colors: formData.colors.filter((_, i) => i !== index),
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Colecciones</Text>
        <TouchableOpacity onPress={handleAddNew} style={styles.addButton}>
          <Plus size={24} color={Colors.light.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {collections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No hay colecciones configuradas</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddNew}>
              <Text style={styles.emptyStateButtonText}>Crear primera colección</Text>
            </TouchableOpacity>
          </View>
        ) : (
          collections.map((collection) => (
            <View key={collection.id} style={styles.collectionCard}>
              <Image source={{ uri: collection.image }} style={styles.collectionImage} />
              <View style={styles.collectionInfo}>
                <View style={styles.collectionHeader}>
                  <Text style={styles.collectionName}>{collection.name}</Text>
                  {collection.featured && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredText}>Destacada</Text>
                    </View>
                  )}
                </View>
                <View style={styles.colorsContainer}>
                  {collection.colors.map((color, index) => (
                    <View key={index} style={styles.colorChip}>
                      <Text style={styles.colorText}>{color}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.collectionActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEdit(collection)}
                  >
                    <Edit2 size={16} color={Colors.light.background} />
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(collection)}
                  >
                    <Trash2 size={16} color={Colors.light.background} />
                    <Text style={styles.actionButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCollection ? 'Editar Colección' : 'Nueva Colección'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Ej: Blanco & Negro Moderno"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>URL de Imagen *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.image}
                  onChangeText={(text) => setFormData({ ...formData, image: text })}
                  placeholder="https://..."
                  autoCapitalize="none"
                />
                {formData.image ? (
                  <Image source={{ uri: formData.image }} style={styles.previewImage} />
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Colores *</Text>
                  <TouchableOpacity onPress={addColor} style={styles.addColorButton}>
                    <Plus size={16} color={Colors.light.primary} />
                    <Text style={styles.addColorText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.colorsContainer}>
                  {formData.colors.map((color, index) => (
                    <View key={index} style={styles.colorChipEditable}>
                      <Text style={styles.colorText}>{color}</Text>
                      <TouchableOpacity onPress={() => removeColor(index)}>
                        <X size={14} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData({ ...formData, featured: !formData.featured })}
                >
                  <View style={[styles.checkbox, formData.featured && styles.checkboxChecked]}>
                    {formData.featured && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Marcar como destacada</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={Colors.light.background} />
                ) : (
                  <>
                    <Save size={20} color={Colors.light.background} />
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  collectionImage: {
    width: '100%',
    height: 200,
  },
  collectionInfo: {
    padding: 16,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
  },
  featuredBadge: {
    backgroundColor: Colors.light.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  colorChip: {
    backgroundColor: Colors.light.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  colorChipEditable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  colorText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  collectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: Colors.light.primary,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  addColorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addColorText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkmark: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: Colors.light.text,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
