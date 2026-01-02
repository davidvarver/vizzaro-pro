import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  X,
  Check,
  Trash2,
  Plus,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ProjectComparisonScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const getProjectById = useFavoritesStore((s) => s.getProjectById);
  const addWallpaperToProject = useFavoritesStore((s) => s.addWallpaperToProject);
  const removeWallpaperFromProject = useFavoritesStore((s) => s.removeWallpaperFromProject);
  const removeFromFavorites = useFavoritesStore((s) => s.removeFromFavorites);
  const wallpapers = useWallpapersStore((s) => s.wallpapers);

  const [showWallpaperModal, setShowWallpaperModal] = useState<boolean>(false);

  const project = getProjectById(projectId || '');

  if (!project) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Proyecto no encontrado</Text>
      </View>
    );
  }

  const handleAddWallpaper = async (wallpaper: any) => {
    if (project) {
      const success = await addWallpaperToProject(project.id, wallpaper);
      if (success) {
        setShowWallpaperModal(false);
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Papel Agregado',
            `"${wallpaper.name}" ha sido agregado al proyecto "${project.name}".`
          );
        }
      } else {
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Ya Existe',
            `"${wallpaper.name}" ya está en este proyecto.`
          );
        }
      }
    }
  };

  const handleRemoveWallpaper = (wallpaperId: string, wallpaperName: string) => {
    if (project.wallpapers.length === 1) {
      if (Platform.OS !== 'web') {
        Alert.alert(
          'No se puede eliminar',
          'No puedes eliminar el último papel tapiz del proyecto. Si deseas eliminarlo, elimina todo el proyecto.'
        );
      } else {
        alert('No puedes eliminar el último papel tapiz del proyecto.');
      }
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Eliminar Papel',
        `¿Estás seguro de que quieres eliminar "${wallpaperName}" de este proyecto?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              await removeWallpaperFromProject(project.id, wallpaperId);
            },
          },
        ]
      );
    } else {
      const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar "${wallpaperName}" de este proyecto?`);
      if (confirmed) {
        removeWallpaperFromProject(project.id, wallpaperId);
      }
    }
  };

  const handleDeleteProject = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Eliminar Proyecto',
        `¿Estás seguro de que quieres eliminar "${project.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              const success = await removeFromFavorites(project.id);
              if (success) {
                router.back();
              }
            },
          },
        ]
      );
    } else {
      const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar "${project.name}"?`);
      if (confirmed) {
        removeFromFavorites(project.id);
        router.back();
      }
    }
  };

  const handleTryWallpaper = (wallpaperId: string) => {
    router.push({
      pathname: '/(tabs)/camera',
      params: {
        wallpaperId: wallpaperId,
        source: 'project',
        projectId: project.id
      }
    });
  };

  const renderWallpaperOption = ({ item: wallpaper }: { item: any }) => {
    const isInProject = project.wallpapers.some(w => w.id === wallpaper.id);

    return (
      <TouchableOpacity
        style={styles.wallpaperOption}
        onPress={() => handleAddWallpaper(wallpaper)}
        disabled={isInProject}
      >
        <Image
          source={{ uri: wallpaper.imageUrl }}
          style={styles.wallpaperOptionImage}
          onError={(error) => {
            console.log('Error loading wallpaper option image:', error.nativeEvent.error);
          }}
          defaultSource={require('@/assets/images/icon.png')}
        />
        <View style={styles.wallpaperOptionInfo}>
          <Text style={styles.wallpaperOptionName}>{wallpaper.name}</Text>
          <Text style={styles.wallpaperOptionCategory}>{wallpaper.category}</Text>
          <Text style={styles.wallpaperOptionPrice}>${wallpaper.price}</Text>
        </View>
        {isInProject && (
          <View style={styles.currentWallpaperBadge}>
            <Check size={16} color={Colors.light.background} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ErrorBoundary>
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
          <Text style={styles.headerTitle}>{project.name}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteProject}
          >
            <Trash2 size={24} color={Colors.light.error} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectRoom}>{project.roomType}</Text>
          </View>

          <View style={styles.wallpapersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Papeles en este Proyecto ({project.wallpapers.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowWallpaperModal(true)}
              >
                <Plus size={20} color={Colors.light.primary} />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {project.wallpapers.map((wallpaper, index) => (
              <View key={wallpaper.id} style={styles.wallpaperCard}>
                <Image
                  source={{ uri: wallpaper.imageUrl }}
                  style={styles.wallpaperImage}
                  onError={(error) => {
                    console.log('Error loading wallpaper image:', error.nativeEvent.error);
                  }}
                  defaultSource={require('@/assets/images/icon.png')}
                />
                <View style={styles.wallpaperInfo}>
                  <Text style={styles.wallpaperName}>{wallpaper.name}</Text>
                  <Text style={styles.wallpaperCategory}>{wallpaper.category}</Text>
                  <Text style={styles.wallpaperPrice}>${wallpaper.price}</Text>
                </View>
                <View style={styles.wallpaperActions}>
                  <TouchableOpacity
                    style={styles.tryButton}
                    onPress={() => handleTryWallpaper(wallpaper.id)}
                  >
                    <Text style={styles.tryButtonText}>Probar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveWallpaper(wallpaper.id, wallpaper.name)}
                  >
                    <Trash2 size={18} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {project.userPhoto && (
            <View style={styles.userPhotoContainer}>
              <Text style={styles.sectionTitle}>Tu Foto</Text>
              <Image
                source={{ uri: project.userPhoto }}
                style={styles.userPhoto}
                onError={(error) => {
                  console.log('Error loading user photo:', error.nativeEvent.error);
                }}
                defaultSource={require('@/assets/images/icon.png')}
              />
            </View>
          )}

          {project.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.sectionTitle}>Notas</Text>
              <Text style={styles.notesText}>{project.notes}</Text>
            </View>
          )}
        </ScrollView>

        <Modal
          visible={showWallpaperModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowWallpaperModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Agregar Papel al Proyecto</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowWallpaperModal(false)}
                >
                  <X size={24} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.currentProjectInfo}>
                <Text style={styles.currentProjectText}>
                  Proyecto: {project.name}
                </Text>
                <Text style={styles.currentWallpaperText}>
                  {project.wallpapers.length} papel{project.wallpapers.length !== 1 ? 'es' : ''} en el proyecto
                </Text>
              </View>

              <FlatList
                data={wallpapers}
                renderItem={renderWallpaperOption}
                keyExtractor={(item) => item.id}
                style={styles.wallpapersList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </View>
    </ErrorBoundary>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  deleteButton: {
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
  projectInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  projectName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  projectRoom: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  wallpapersSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  wallpaperCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wallpaperImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  wallpaperInfo: {
    flex: 1,
    gap: 4,
  },
  wallpaperName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  wallpaperCategory: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  wallpaperPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  wallpaperActions: {
    gap: 8,
  },
  tryButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.background,
  },
  removeButton: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPhotoContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  userPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  notesContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  notesText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.error,
    textAlign: 'center',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  currentProjectInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  currentProjectText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  currentWallpaperText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  wallpapersList: {
    paddingHorizontal: 20,
  },
  wallpaperOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    position: 'relative',
  },
  wallpaperOptionImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  wallpaperOptionInfo: {
    flex: 1,
    gap: 2,
  },
  wallpaperOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  wallpaperOptionCategory: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  wallpaperOptionPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  currentWallpaperBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.light.success,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
