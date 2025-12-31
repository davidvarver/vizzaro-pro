import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAdmin } from '../../../contexts/AdminContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Clock, CheckCircle } from 'lucide-react-native';

interface Order {
    id: string;
    customerInfo: {
        name: string;
        email: string;
    };
    total: number;
    status: string;
    createdAt: string;
}

export default function AdminOrdersList() {
    const router = useRouter();
    const { adminToken } = useAdmin();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            const response = await fetch(`${apiUrl}/api/orders/list`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setOrders(data.orders);
            } else {
                Alert.alert('Error', data.error || 'Failed to fetch orders');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            Alert.alert('Error', 'Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#10B981';
            case 'shipped': return '#3B82F6';
            case 'pending': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    const renderOrder = ({ item }: { item: Order }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/admin/orders/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Order #{item.id.slice(-6)}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <Text style={styles.customerName}>{item.customerInfo.name}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.total}>${item.total.toFixed(2)}</Text>
                <Text style={styles.viewDetails}>View Details →</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#000" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Orders</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#000" />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.center}>
                    <Package size={48} color="#9CA3AF" />
                    <Text style={styles.emptyText}>No orders found</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrder}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshing={isLoading}
                    onRefresh={fetchOrders}
                />
            )}
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
    list: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    orderId: { fontSize: 16, fontWeight: '600', color: '#111' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    cardContent: { marginBottom: 12 },
    customerName: { fontSize: 14, color: '#374151', marginBottom: 4 },
    date: { fontSize: 12, color: '#6B7280' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    total: { fontSize: 18, fontWeight: 'bold', color: '#111' },
    viewDetails: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
    emptyText: { marginTop: 12, color: '#6B7280', fontSize: 16 },
});
