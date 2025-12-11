import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Package, Calendar, MapPin, CreditCard } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useOrdersStore } from '@/stores/useOrdersStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { orders, isLoading } = useOrdersStore();
  const { user, isAuthenticated } = useAuthStore();

  const userOrders = useMemo(() => {
    if (!isAuthenticated || !user?.email) {
      return [];
    }
    return orders
      .filter(order => order.customerEmail === user.email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, user, isAuthenticated]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return Colors.light.warning;
      case 'confirmed':
        return '#3B82F6';
      case 'preparing':
        return '#F59E0B';
      case 'ready':
        return '#10B981';
      case 'delivered':
        return Colors.light.success;
      case 'cancelled':
        return Colors.light.error;
      default:
        return Colors.light.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'preparing':
        return 'Preparando';
      case 'ready':
        return 'Listo';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Historial de Pedidos',
            headerStyle: { backgroundColor: Colors.light.background },
            headerTintColor: Colors.light.text,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color={Colors.light.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Package size={64} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>Inicia sesión</Text>
          <Text style={styles.emptyText}>
            Debes iniciar sesión para ver tu historial de pedidos
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login' as any)}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Historial de Pedidos',
            headerStyle: { backgroundColor: Colors.light.background },
            headerTintColor: Colors.light.text,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={24} color={Colors.light.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Cargando pedidos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Historial de Pedidos',
          headerStyle: { backgroundColor: Colors.light.background },
          headerTintColor: Colors.light.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.light.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.safeArea}>
        {userOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color={Colors.light.textSecondary} />
            <Text style={styles.emptyTitle}>No hay pedidos</Text>
            <Text style={styles.emptyText}>
              Aún no has realizado ningún pedido. ¡Comienza a comprar!
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/' as any)}
            >
              <Text style={styles.shopButtonText}>Explorar Catálogo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Mis Pedidos</Text>
              <Text style={styles.headerSubtitle}>
                {userOrders.length} {userOrders.length === 1 ? 'pedido' : 'pedidos'}
              </Text>
            </View>

            {userOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderId}>Pedido #{order.id}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(order.status)}20` },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: getStatusColor(order.status) }]}
                      >
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                </View>

                <View style={styles.orderDetail}>
                  <Calendar size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.orderDetailText}>
                    {new Date(order.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.orderDetail}>
                  <MapPin size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.orderDetailText}>
                    {order.deliveryMethod === 'delivery'
                      ? `Envío: ${order.customerAddress}`
                      : 'Recoger en tienda'}
                  </Text>
                </View>

                {order.paymentMethod && (
                  <View style={styles.orderDetail}>
                    <CreditCard size={16} color={Colors.light.textSecondary} />
                    <Text style={styles.orderDetailText}>
                      {order.paymentMethod === 'zelle' ? 'Zelle' : 'Tarjeta de Crédito'}
                      {order.paymentMethod === 'zelle' && order.zelleReference && (
                        <Text style={styles.referenceText}>
                          {' '}
                          - Ref: {order.zelleReference}
                        </Text>
                      )}
                    </Text>
                  </View>
                )}

                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsTitle}>
                    Productos ({order.items.length}):
                  </Text>
                  {order.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.wallpaper.name}
                      </Text>
                      <Text style={styles.itemQuantity}>x{item.rollsNeeded}</Text>
                    </View>
                  ))}
                </View>

                {order.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notas:</Text>
                    <Text style={styles.notesText}>{order.notes}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  safeArea: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  shopButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  orderCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  orderDetailText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  referenceText: {
    fontWeight: '600',
    color: Colors.light.primary,
  },
  itemsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginRight: 8,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});
