import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Package,
  ShoppingCart,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOrdersStore } from '@/stores/useOrdersStore';
import Colors from '@/constants/colors';
import WhatsAppButton from '@/components/WhatsAppButton';
import AdminGuard from '@/components/AdminGuard';

export default function AdminDashboard() {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { user, logout } = useAuthStore();
  const { orders, getOrderStats } = useOrdersStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const stats = getOrderStats();

  const onRefresh = async () => {
    setRefreshing(true);
    // Simular carga de datos
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login' as any);
  };

  const navigateToOrders = () => {
    router.push('/admin/orders' as any);
  };

  const navigateToCatalog = () => {
    router.push('/admin/catalog' as any);
  };

  const navigateToCollections = () => {
    router.push('/admin/collections' as any);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    onPress
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statCardContent}>
        <View style={styles.statCardHeader}>
          <Icon size={24} color={color} />
          <Text style={styles.statCardTitle}>{title}</Text>
        </View>
        <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickActionCard = ({
    title,
    description,
    icon: Icon,
    color,
    onPress
  }: {
    title: string;
    description: string;
    icon: any;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionCardIcon, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.actionCardContent}>
        <Text style={styles.actionCardTitle}>{title}</Text>
        <Text style={styles.actionCardDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <AdminGuard>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Bienvenido,</Text>
            <Text style={styles.adminName}>{user?.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={Colors.light.tabIconDefault} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas Generales</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Pedidos"
                value={stats.total}
                icon={ShoppingCart}
                color="#3B82F6"
                onPress={navigateToOrders}
              />
              <StatCard
                title="Pendientes"
                value={stats.pending}
                icon={Clock}
                color="#F59E0B"
                onPress={navigateToOrders}
              />
              <StatCard
                title="Completados"
                value={stats.delivered}
                icon={CheckCircle}
                color="#10B981"
                onPress={navigateToOrders}
              />
              <StatCard
                title="Ingresos"
                value={`${(typeof stats.totalRevenue === 'number' && !isNaN(stats.totalRevenue) ? stats.totalRevenue : 0).toFixed(2)}`}
                icon={TrendingUp}
                color="#8B5CF6"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.actionsGrid}>
              <QuickActionCard
                title="Gestionar Pedidos"
                description="Ver y actualizar pedidos"
                icon={ShoppingCart}
                color="#3B82F6"
                onPress={navigateToOrders}
              />
              <QuickActionCard
                title="Catálogo"
                description="Administrar productos"
                icon={Package}
                color="#10B981"
                onPress={navigateToCatalog}
              />
              <QuickActionCard
                title="Colecciones"
                description="Gestionar colecciones destacadas"
                icon={BarChart3}
                color="#8B5CF6"
                onPress={navigateToCollections}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pedidos Recientes</Text>
            {orders.slice(0, 3).map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderCustomer}>{order.customerName}</Text>
                  <View style={[
                    styles.statusBadge,
                    styles.statusBadgeBackground,
                    { backgroundColor: getStatusColor(order.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) }
                    ]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderTotal}>
                  ${(typeof order.total === 'number' && !isNaN(order.total) ? order.total : 0).toFixed(2)}
                </Text>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}

            {orders.length === 0 && (
              <View style={styles.emptyState}>
                <AlertCircle size={48} color={Colors.light.tabIconDefault} />
                <Text style={styles.emptyStateText}>No hay pedidos aún</Text>
              </View>
            )}
          </View>

          <View style={styles.whatsappSection}>
            <WhatsAppButton
              message="Hola, soy el administrador de la tienda de papel tapiz"
              style="secondary"
              size="large"
            />
          </View>
        </ScrollView>
      </View>
    </AdminGuard>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#F59E0B';
    case 'confirmed':
      return '#3B82F6';
    case 'preparing':
      return '#8B5CF6';
    case 'ready':
      return '#06B6D4';
    case 'delivered':
      return '#10B981';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

function getStatusText(status: string): string {
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
  welcomeText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  adminName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardContent: {
    gap: 8,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statCardTitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  actionCardDescription: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
  },
  whatsappSection: {
    padding: 20,
    alignItems: 'center',
  },
  statusBadgeBackground: {
    // Placeholder for dynamic background color
  },
});