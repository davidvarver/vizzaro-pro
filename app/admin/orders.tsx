import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Phone,
  Mail,
  MapPin,
  Package,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { useOrders } from '@/contexts/OrdersContext';
import Colors from '@/constants/colors';

export default function AdminOrdersScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const { orders, updateOrderStatus, updateOrder } = useOrders();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const statusOptions = [
    { key: 'all', label: 'Todos', color: '#6B7280' },
    { key: 'pending', label: 'Pendientes', color: '#F59E0B' },
    { key: 'confirmed', label: 'Confirmados', color: '#3B82F6' },
    { key: 'preparing', label: 'Preparando', color: '#8B5CF6' },
    { key: 'ready', label: 'Listos', color: '#06B6D4' },
    { key: 'delivered', label: 'Entregados', color: '#10B981' },
    { key: 'cancelled', label: 'Cancelados', color: '#EF4444' },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customerPhone.includes(searchQuery) ||
                         order.id.includes(searchQuery);
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (orderId: string, newStatus: any) => {
    if (!newStatus || typeof newStatus !== 'string' || newStatus.trim().length === 0) {
      console.error('Invalid status provided');
      return;
    }
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    const trimmedStatus = newStatus.trim();
    if (!validStatuses.includes(trimmedStatus)) {
      console.error('Invalid status value');
      return;
    }
    await updateOrderStatus(orderId, trimmedStatus as any);
  };

  const handleConfirmZellePayment = async (orderId: string) => {
    await updateOrder(orderId, {
      zelleConfirmed: true,
      zelleConfirmedAt: new Date().toISOString(),
      status: 'confirmed',
    });
  };

  const getStatusColor = (status: string): string => {
    const statusOption = statusOptions.find(opt => opt.key === status);
    return statusOption?.color || '#6B7280';
  };

  const getStatusText = (status: string): string => {
    const statusOption = statusOptions.find(opt => opt.key === status);
    return statusOption?.label || status;
  };

  const StatusButton = ({ 
    status, 
    orderId, 
    currentStatus 
  }: { 
    status: string; 
    orderId: string; 
    currentStatus: string;
  }) => {
    if (status === 'all') return null;
    
    const isActive = currentStatus === status;
    const color = getStatusColor(status);
    
    return (
      <TouchableOpacity
        style={[
          styles.statusButton,
          isActive && styles.statusButtonActive,
          { borderColor: color }
        ]}
        onPress={() => handleStatusChange(orderId, status)}
        disabled={isActive}
      >
        <Text style={[
          styles.statusButtonText,
          isActive && styles.statusButtonTextActive,
          { color: isActive ? '#FFFFFF' : color }
        ]}>
          {getStatusText(status)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Pedidos</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.light.tabIconDefault} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, teléfono o ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statusOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterChip,
              selectedStatus === option.key && styles.filterChipActive,
              { borderColor: option.color }
            ]}
            onPress={() => setSelectedStatus(option.key)}
          >
            <Text style={[
              styles.filterChipText,
              selectedStatus === option.key && styles.filterChipTextActive,
              { color: selectedStatus === option.key ? '#FFFFFF' : option.color }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={Colors.light.tabIconDefault} />
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedStatus !== 'all' 
                ? 'No se encontraron pedidos con los filtros aplicados'
                : 'No hay pedidos aún'
              }
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>Pedido #{order.id}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: getStatusColor(order.status) }
                  ]}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.customerInfo}>
                <View style={styles.customerRow}>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Phone size={16} color={Colors.light.tabIconDefault} />
                  <Text style={styles.contactText}>{order.customerPhone}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Mail size={16} color={Colors.light.tabIconDefault} />
                  <Text style={styles.contactText}>{order.customerEmail}</Text>
                </View>
                <View style={styles.contactRow}>
                  <MapPin size={16} color={Colors.light.tabIconDefault} />
                  <Text style={styles.contactText}>{order.customerAddress}</Text>
                </View>
              </View>

              <View style={styles.orderItems}>
                <Text style={styles.itemsTitle}>Productos ({order.items.length})</Text>
                {order.items.map((item) => (
                  <View key={`${order.id}-${item.id}`} style={styles.orderItem}>
                    <Text style={styles.itemName}>{item.wallpaper.name}</Text>
                    <Text style={styles.itemDetails}>
                      {item.rollsNeeded} rollos × ${item.wallpaper.price.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>${order.total.toFixed(2)}</Text>
                </View>
                <Text style={styles.deliveryMethod}>
                  {order.deliveryMethod === 'pickup' ? 'Recoger en tienda' : 'Envío a domicilio'}
                </Text>
              </View>

              {order.paymentMethod === 'zelle' && order.zelleReference && (
                <View style={[styles.zelleContainer, order.zelleConfirmed ? styles.zelleConfirmed : styles.zellePending]}>
                  <View style={styles.zelleHeader}>
                    <DollarSign size={20} color={order.zelleConfirmed ? '#10B981' : '#F59E0B'} />
                    <Text style={[styles.zelleTitle, { color: order.zelleConfirmed ? '#10B981' : '#F59E0B' }]}>
                      Pago con Zelle
                    </Text>
                  </View>
                  <View style={styles.zelleRow}>
                    <Text style={styles.zelleLabel}>Código de Referencia:</Text>
                    <Text style={styles.zelleValue}>{order.zelleReference}</Text>
                  </View>
                  <View style={styles.zelleStatus}>
                    {order.zelleConfirmed ? (
                      <View style={styles.zelleStatusRow}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <Text style={styles.zelleConfirmedText}>
                          Pago confirmado {order.zelleConfirmedAt && `el ${new Date(order.zelleConfirmedAt).toLocaleDateString('es-ES')}`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.zelleStatusRow}>
                        <AlertCircle size={16} color="#F59E0B" />
                        <Text style={styles.zellePendingText}>Esperando confirmación de pago</Text>
                      </View>
                    )}
                  </View>
                  {!order.zelleConfirmed && (
                    <TouchableOpacity
                      style={styles.confirmPaymentButton}
                      onPress={() => handleConfirmZellePayment(order.id)}
                    >
                      <CheckCircle2 size={18} color="#FFFFFF" />
                      <Text style={styles.confirmPaymentButtonText}>Confirmar Pago Recibido</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {order.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notas:</Text>
                  <Text style={styles.notesText}>{order.notes}</Text>
                </View>
              )}

              <View style={styles.statusActions}>
                <Text style={styles.statusActionsTitle}>Cambiar estado:</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.statusButtonsContainer}
                >
                  {statusOptions.map((option) => (
                    <StatusButton
                      key={option.key}
                      status={option.key}
                      orderId={order.id}
                      currentStatus={order.status}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          ))
        )}
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
  headerRight: {
    width: 32,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    maxWidth: 280,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerInfo: {
    marginBottom: 16,
  },
  customerRow: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    flex: 1,
  },
  orderItems: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  orderItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  deliveryMethod: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  notesContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    lineHeight: 20,
  },
  statusActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 16,
  },
  statusActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  statusButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  zelleContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  zellePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  zelleConfirmed: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  zelleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  zelleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  zelleRow: {
    marginBottom: 8,
  },
  zelleLabel: {
    fontSize: 13,
    color: Colors.light.tabIconDefault,
    marginBottom: 4,
  },
  zelleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  zelleStatus: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  zelleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zelleConfirmedText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  zellePendingText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '500',
  },
  confirmPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  confirmPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});