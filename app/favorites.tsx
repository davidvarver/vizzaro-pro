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
  Modal,
  FlatList,
  TextInput,

} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Edit3,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  X,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useFavorites, FavoriteProject } from '@/contexts/FavoritesContext';
import { useWallpapers } from '@/contexts/WallpapersContext';



export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favoriteProjects, removeFromFavorites } = useFavorites();
  const { wallpapers } = useWallpapers();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [showWallpaperModal, setShowWallpaperModal] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<FavoriteProject | null>(null);

  const roomTypes = ['all', 'sala', 'dormitorio', 'cocina', 'baño', 'comedor', 'oficina'];

  const filteredProjects = (favoriteProjects || []).filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.wallpapers.length > 0 && project.wallpapers[0].name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRoom = selectedRoom === 'all' || 
                       project.roomType.toLowerCase() === selectedRoom.toLowerCase();
    return matchesSearch && matchesRoom;
  });

  const handleDeleteProject = (project: FavoriteProject) => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Eliminar Proyecto',
        `¿Estás seguro de que quieres eliminar "${project.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => removeFromFavorites(project.id),
          },
        ]
      );
    } else {
      removeFromFavorites(project.id);
    }
  };

  const handleWallpaperSelection = async (newWallpaper: any) => {
    if (selectedProject) {
      setShowWallpaperModal(false);
      setSelectedProject(null);
      if (Platform.OS !== 'web') {
        Alert.alert(
          'No Disponible',
          'La función de cambio de papel tapiz no está implementada aún.'
        );
      }
    }
  };

  const renderProjectCard = ({ item: project }: { item: FavoriteProject }) => (
    <View style={styles.projectCard}>
      <View style={styles.projectImageContainer}>
        {project.userPhoto ? (
          <Image source={{ uri: project.userPhoto }} style={styles.projectImage} />
        ) : project.wallpapers.length > 0 ? (
          <Image source={{ uri: project.wallpapers[0].imageUrl }} style={styles.projectImage} />
        ) : null}
        <View style={styles.projectOverlay}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectRoom}>{project.roomType}</Text>
            <Text style={styles.projectWallpaper}>
              {project.wallpapers.length > 0 ? project.wallpapers[0].name : 'Sin papel'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.projectActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/project-comparison/${project.id}`)}
        >
          <RefreshCw size={16} color={Colors.light.primary} />
          <Text style={styles.actionButtonText}>Comparar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            router.push({
              pathname: '/(tabs)/camera',
              params: { 
                wallpaperId: project.wallpapers.length > 0 ? project.wallpapers[0].id : '',
                source: 'favorite',
                projectId: project.id
              }
            });
          }}
        >
          <Edit3 size={16} color={Colors.light.textSecondary} />
          <Text style={styles.actionButtonText}>Probar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteProject(project)}
        >
          <Trash2 size={16} color={Colors.light.error} />
        </TouchableOpacity>
      </View>

      {project.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{project.notes}</Text>
        </View>
      )}

      <View style={styles.projectMeta}>
        <Text style={styles.metaText}>
          Creado: {new Date(project.dateCreated).toLocaleDateString()}
        </Text>
        {project.dateModified !== project.dateCreated && (
          <Text style={styles.metaText}>
            Modificado: {new Date(project.dateModified).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  const renderWallpaperOption = ({ item: wallpaper }: { item: any }) => (
    <TouchableOpacity
      style={styles.wallpaperOption}
      onPress={() => handleWallpaperSelection(wallpaper)}
    >
      <Image source={{ uri: wallpaper.imageUrl }} style={styles.wallpaperOptionImage} />
      <View style={styles.wallpaperOptionInfo}>
        <Text style={styles.wallpaperOptionName}>{wallpaper.name}</Text>
        <Text style={styles.wallpaperOptionCategory}>{wallpaper.category}</Text>
        <Text style={styles.wallpaperOptionPrice}>${wallpaper.price}</Text>
      </View>
      {selectedProject && selectedProject.wallpapers && selectedProject.wallpapers.length > 0 && selectedProject.wallpapers[0].id === wallpaper.id && (
        <View style={styles.currentWallpaperBadge}>
          <Check size={16} color={Colors.light.background} />
        </View>
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Mis Favoritos</Text>
        <View style={styles.headerRight}>
          <Heart size={24} color={Colors.light.error} fill={Colors.light.error} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar proyectos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textSecondary}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {roomTypes.map((room) => (
          <TouchableOpacity
            key={room}
            style={[
              styles.filterChip,
              selectedRoom === room && styles.filterChipSelected,
            ]}
            onPress={() => setSelectedRoom(room)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedRoom === room && styles.filterChipTextSelected,
              ]}
            >
              {room === 'all' ? 'Todos' : room.charAt(0).toUpperCase() + room.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={64} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>No hay proyectos favoritos</Text>
          <Text style={styles.emptyDescription}>
            {searchQuery || selectedRoom !== 'all'
              ? 'No se encontraron proyectos con los filtros aplicados'
              : 'Guarda tus proyectos favoritos para verlos aquí'}
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Plus size={20} color={Colors.light.background} />
            <Text style={styles.exploreButtonText}>Explorar Papeles</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={renderProjectCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.projectsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showWallpaperModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWallpaperModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Papel Tapiz</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowWallpaperModal(false)}
              >
                <X size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedProject && (
              <View style={styles.currentProjectInfo}>
                <Text style={styles.currentProjectText}>
                  Proyecto: {selectedProject.name}
                </Text>
                <Text style={styles.currentWallpaperText}>
                  Papel actual: {selectedProject.wallpapers.length > 0 ? selectedProject.wallpapers[0].name : 'Sin papel'}
                </Text>
              </View>
            )}

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
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  filterContainer: {
    paddingBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  filterChipTextSelected: {
    color: Colors.light.background,
  },
  projectsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  projectCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  projectImageContainer: {
    position: 'relative',
    height: 200,
  },
  projectImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  projectOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  projectInfo: {
    gap: 4,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.background,
  },
  projectRoom: {
    fontSize: 14,
    color: Colors.light.background,
    opacity: 0.9,
  },
  projectWallpaper: {
    fontSize: 12,
    color: Colors.light.background,
    opacity: 0.8,
  },
  projectActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  notesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  projectMeta: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
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