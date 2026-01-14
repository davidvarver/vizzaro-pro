import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAdmin } from '../../../contexts/AdminContext';
import { useOrdersStore } from '@/store/useOrdersStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Truck, User, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function OrderDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { adminToken } = useAdmin();
    const orders = useOrdersStore((s) => s.orders); // Access loaded orders

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!id) return;

        // 1. Try to find in Context first (fast)
        if (orders && orders.length > 0) {
            const found = orders.find(o => o.id === id || o.id === String(id));
            if (found) {
                console.log('Found order in context:', found.id);
                setOrder(found);
                setIsLoading(false);
                return; // Can stop here or optionally re-fetch to ensure freshness
            }
        }

        // 2. Fetch from API if not in context
        fetchOrderDetails();
    }, [id, orders]);

    const fetchOrderDetails = async () => {
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            // If no API URL, we can't fetch.
            if (!apiUrl) {
                setIsLoading(false);
                return;
            }

            const response = await fetch(`${apiUrl}/api/orders/${id}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await response.json();
            if (data.success) {
                setOrder(data.order);
            } else {
                // Only alert if we really expected it and didn't find it in context
                // Alert.alert('Error', data.error);
                console.warn('Order not found in API');
            }
        } catch (error) {
            console.error('Fetch details error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return '#10B981';
            case 'shipped': return '#3B82F6';
            case 'delivered': return '#111827';
            case 'pending': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    const updateStatus = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            if (!apiUrl) {
                // Mock update if no API
                setOrder({ ...order, status: newStatus });
                Alert.alert('Success', `Order marked as ${newStatus} (Local)`);
                setIsUpdating(false);
                return;
            }

            const response = await fetch(`${apiUrl}/api/orders/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();
            if (data.success) {
                setOrder(data.order);
                Alert.alert('Success', `Order marked as ${newStatus}`);
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color="#000" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Detalles del Pedido</Text>
                </View>
                <View style={styles.center}>
                    <Text style={styles.errorText}>No se encontró el pedido #{id}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchOrderDetails}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#000" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Pedido #{String(order.id).slice(-6)}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Estado</Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                {order.status ? order.status.toUpperCase() : 'PENDING'}
                            </Text>
                        </View>
                        {/* Show PAID badge if status implies payment */}
                        {(order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') && (
                            <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7', marginLeft: 8 }]}>
                                <Text style={[styles.statusText, { color: '#166534' }]}>PAID</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.actions}>
                        {/* Show Mark Paid only if NOT paid/shipped/delivered */}
                        {['pending', 'confirmed', 'preparing'].includes(order.status || 'pending') && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                                onPress={() => updateStatus('paid')}
                                disabled={isUpdating}
                            >
                                <CreditCard color="#fff" size={20} />
                                <Text style={styles.actionText}>Marcar Pagado</Text>
                            </TouchableOpacity>
                        )}

                        {/* Show Mark Shipped if Paid (or if we want to allow skipping, but safe bet is Paid) */}
                        {order.status === 'paid' && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                                onPress={() => updateStatus('shipped')}
                                disabled={isUpdating}
                            >
                                <Truck color="#fff" size={20} />
                                <Text style={styles.actionText}>Marcar Enviado</Text>
                            </TouchableOpacity>
                        )}

                        {order.status === 'shipped' && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#111827' }]}
                                onPress={() => updateStatus('delivered')}
                                disabled={isUpdating}
                            >
                                <CheckCircle color="#fff" size={20} />
                                <Text style={styles.actionText}>Marcar Entregado</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Customer Info */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <User size={20} color={Colors.light.primary} />
                        <Text style={styles.sectionTitle}>Cliente</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Nombre:</Text>
                        <Text style={styles.value}>{order.customerName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>{order.customerEmail}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Teléfono:</Text>
                        <Text style={styles.value}>{order.customerPhone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Dirección:</Text>
                        <Text style={styles.value}>{order.customerAddress}</Text>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Productos</Text>
                    {order.items && order.items.map((item: any, index: number) => (
                        <View key={index} style={styles.itemRow}>
                            <View>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemMeta}>Cant: {item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${order.total ? order.total.toFixed(2) : '0.00'}</Text>
                    </View>
                </View>

                {/* Payment Ref - Fixed Data Access */}
                {(order.paymentReference || (order.payment && order.payment.reference)) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Referencia de Pago {order.paymentMethod === 'zelle' ? '(Zelle)' : ''}
                        </Text>
                        <Text style={styles.refText}>
                            {order.paymentReference || order.payment?.reference}
                        </Text>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: { marginRight: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#111' },
    text: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
    statusContainer: { flexDirection: 'row', marginBottom: 16 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    statusText: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
    actions: { flexDirection: 'row', gap: 12 },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8
    },
    actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    itemName: { fontSize: 14, fontWeight: '500', color: '#111' },
    itemMeta: { fontSize: 13, color: '#6B7280' },
    itemPrice: { fontSize: 14, fontWeight: '600' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
    totalLabel: { fontSize: 16, fontWeight: 'bold' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
    refText: { fontSize: 16, fontFamily: 'monospace', color: '#111', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 4 },
    errorText: { fontSize: 16, color: '#666', marginBottom: 20 },
    retryBtn: { padding: 10, backgroundColor: '#000', borderRadius: 6 },

    retryText: { color: '#FFF' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
    label: { color: '#666', fontSize: 14 },
    value: { color: '#111', fontWeight: '500', fontSize: 14, flex: 1, textAlign: 'right' }
});
