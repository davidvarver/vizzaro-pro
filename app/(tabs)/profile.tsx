import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { User, Heart, Clock, Settings, ChevronRight, Package, Shield, LogOut, LogIn } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';


interface Project {
  id: string;
  name: string;
  wallpaper: string;
  date: string;
  status: 'completed' | 'in_progress' | 'planned';
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { favoriteProjects } = useFavorites();

  const recentProjects = useMemo(() => {
    return favoriteProjects
      .sort((a, b) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime())
      .slice(0, 3)
      .map(project => ({
        id: project.id,
        name: project.name,
        wallpaper: project.wallpapers.length > 0 ? project.wallpapers[0].name : 'Sin papel',
        date: new Date(project.dateModified).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'completed' as const,
      }));
  }, [favoriteProjects]);

  const stats = useMemo(() => {
    return {
      totalProjects: favoriteProjects.length,
      totalFavorites: favoriteProjects.length,
      pendingProjects: 0,
    };
  }, [favoriteProjects]);

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return Colors.light.success;
      case 'in_progress':
        return Colors.light.warning;
      case 'planned':
        return Colors.light.textSecondary;
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'in_progress':
        return 'En Progreso';
      case 'planned':
        return 'Planeado';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login' as any);
          },
        },
      ]
    );
  };



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {isAdmin && (
          <View style={styles.adminBanner}>
            <Shield size={16} color={Colors.light.background} />
            <Text style={styles.adminBannerText}>Cuenta de Administrador</Text>
          </View>
        )}

        <View style={styles.header}>
          {isAuthenticated ? (
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <User size={32} color={Colors.light.primary} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.guestSection}>
              <View style={styles.avatar}>
                <User size={32} color={Colors.light.textSecondary} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>Invitado</Text>
                <Text style={styles.userEmail}>Inicia sesión para acceder a todas las funciones</Text>
              </View>
            </View>
          )}
        </View>

        {isAuthenticated && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Package size={24} color={Colors.light.primary} />
              <Text style={styles.statNumber}>{stats.totalProjects}</Text>
              <Text style={styles.statLabel}>Proyectos</Text>
            </View>
            <View style={styles.statCard}>
              <Heart size={24} color={Colors.light.error} />
              <Text style={styles.statNumber}>{stats.totalFavorites}</Text>
              <Text style={styles.statLabel}>Favoritos</Text>
            </View>
            <View style={styles.statCard}>
              <Clock size={24} color={Colors.light.warning} />
              <Text style={styles.statNumber}>{stats.pendingProjects}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>
        )}

        {isAuthenticated && recentProjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proyectos Recientes</Text>
            {recentProjects.map((project) => (
              <TouchableOpacity 
                key={project.id} 
                style={styles.projectCard}
                onPress={() => router.push(`/project-comparison/${project.id}` as any)}
              >
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectWallpaper}>{project.wallpaper}</Text>
                  <Text style={styles.projectDate}>{project.date}</Text>
                </View>
                <View style={styles.projectStatus}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(project.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                    {getStatusText(project.status)}
                  </Text>
                  <ChevronRight size={16} color={Colors.light.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/favorites' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Heart size={20} color={Colors.light.textSecondary} />
              <Text style={styles.menuItemText}>Mis Favoritos</Text>
            </View>
            <ChevronRight size={16} color={Colors.light.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Package size={20} color={Colors.light.textSecondary} />
              <Text style={styles.menuItemText}>Historial de Pedidos</Text>
            </View>
            <ChevronRight size={16} color={Colors.light.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Settings size={20} color={Colors.light.textSecondary} />
              <Text style={styles.menuItemText}>Configuración</Text>
            </View>
            <ChevronRight size={16} color={Colors.light.textSecondary} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/admin/dashboard' as any)}
            >
              <View style={styles.menuItemLeft}>
                <Shield size={20} color={Colors.light.primary} />
                <Text style={[styles.menuItemText, { color: Colors.light.primary }]}>Panel de Administración</Text>
              </View>
              <ChevronRight size={16} color={Colors.light.primary} />
            </TouchableOpacity>
          )}

          {isAuthenticated ? (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <View style={styles.menuItemLeft}>
                <LogOut size={20} color={Colors.light.error} />
                <Text style={[styles.menuItemText, { color: Colors.light.error }]}>Cerrar Sesión</Text>
              </View>
              <ChevronRight size={16} color={Colors.light.error} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/auth/login' as any)}
            >
              <View style={styles.menuItemLeft}>
                <LogIn size={20} color={Colors.light.primary} />
                <Text style={[styles.menuItemText, { color: Colors.light.primary }]}>Iniciar Sesión</Text>
              </View>
              <ChevronRight size={16} color={Colors.light.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>¿Necesitas Ayuda?</Text>
            <Text style={styles.contactText}>
              Nuestro equipo está aquí para ayudarte con cualquier pregunta sobre papel tapiz
            </Text>
            <View style={styles.whatsappContainer}>
              <WhatsAppButton
                message="Hola, necesito ayuda con la selección de papel tapiz para mi hogar"
                style="secondary"
                size="medium"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  guestSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  projectCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  projectWallpaper: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  projectStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  contactCard: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 20,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.background,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: Colors.light.background,
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  whatsappContainer: {
    alignItems: 'flex-start',
  },
  adminBanner: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adminBannerText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  adminLogoutButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  adminLogoutText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
});