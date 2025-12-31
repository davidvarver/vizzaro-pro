import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAdmin } from '../../../contexts/AdminContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Truck, CreditCard } from 'lucide-react-native';

export default function OrderDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { adminToken } = useAdmin();
    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (id) fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${apiUrl}/api/orders/${id}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await response.json();
            if (data.success) {
                setOrder(data.order);
            } else {
                Alert.alert('Error', data.error);
            }
        } catch (error) {
            console.error('Fetch details error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
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

    if (!order) return null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#000" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Order #{order.id.slice(-6)}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: '#E5E7EB' }]}>
                            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        {order.status !== 'paid' && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                                onPress={() => updateStatus('paid')}
                                disabled={isUpdating}
                            >
                                <CreditCard color="#fff" size={20} />
                                <Text style={styles.actionText}>Mark Paid</Text>
                            </TouchableOpacity>
                        )}

                        {order.status === 'paid' && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                                onPress={() => updateStatus('shipped')}
                                disabled={isUpdating}
                            >
                                <Truck color="#fff" size={20} />
                                <Text style={styles.actionText}>Mark Shipped</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Customer Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Customer</Text>
                    <Text style={styles.text}>{order.customerInfo.name}</Text>
                    <Text style={styles.text}>{order.customerInfo.email}</Text>
                    <Text style={styles.text}>{order.customerInfo.phone}</Text>
                </View>

                {/* Shipping Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Shipping Address</Text>
                    <Text style={styles.text}>{order.customerInfo.address}</Text>
                    <Text style={styles.text}>{order.customerInfo.city}, {order.customerInfo.state} {order.customerInfo.zipCode}</Text>
                </View>

                {/* Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {order.items.map((item: any, index: number) => (
                        <View key={index} style={styles.itemRow}>
                            <View>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                            </View>
                            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Payment Ref */}
                {order.paymentReference && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Payment Reference (Zelle)</Text>
                        <Text style={styles.refText}>{order.paymentReference}</Text>
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
    refText: { fontSize: 16, fontFamily: 'monospace', color: '#111', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 4 }
});
