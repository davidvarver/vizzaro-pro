import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import Colors from '@/constants/colors';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('[AdminGuard] Usuario no autenticado, redirigiendo a login');
        router.replace('/auth/login' as any);
      } else if (!isAdmin) {
        console.log('[AdminGuard] Usuario no es admin, redirigiendo a home');
        router.replace('/home' as any);
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Verificando permisos...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Acceso denegado</Text>
        <Text style={styles.errorSubtext}>
          No tienes permisos para acceder a esta sección
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
