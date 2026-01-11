import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Home, ShoppingBag, Copy, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';
import { useOrdersStore } from '@/store/useOrdersStore';

export default function OrderSuccessScreen() {
    const router = useRouter();
    const { orderId } = useLocalSearchParams();
    const orders = useOrdersStore((s) => s.orders);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            // Find the order in context (since we just created it)
            const foundOrder = orders.find(o => o.id === orderId);
            if (foundOrder) {
                setOrder(foundOrder);
            }
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [orderId, orders]);

    const copyToClipboard = async () => {
        if (orderId) {
            await Clipboard.setStringAsync(orderId as string);
            alert('Order number copied to clipboard');
        }
    };

    const handleContinueShopping = () => {
        router.push('/(tabs)/home');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.successIconContainer}>
                    <CheckCircle size={80} color="#10B981" fill="#D1FAE5" />
                </View>

                <Text style={styles.title}>Thank you for your purchase!</Text>
                <Text style={styles.subtitle}>
                    Your order has been received and we are processing it.
                    {order?.customerEmail ? ` We sent a confirmation email to ${order.customerEmail}.` : ''}
                </Text>

                <View style={styles.orderInfoCard}>
                    <Text style={styles.orderLabel}>Order Number</Text>
                    <View style={styles.orderNumberContainer}>
                        <Text style={styles.orderNumber}>#{orderId}</Text>
                        <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                            <Copy size={20} color={Colors.light.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.saveNote}>
                        Save this number to track your order.
                    </Text>
                </View>

                {order && (
                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsTitle}>Summary</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Total Paid</Text>
                            <Text style={styles.detailValue}>${order.total.toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Payment Method</Text>
                            <Text style={styles.detailValue}>
                                {order.paymentMethod === 'zelle' ? 'Zelle Transfer' : 'Credit Card'}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Delivery</Text>
                            <Text style={styles.detailValue}>
                                {order.deliveryMethod === 'delivery' ? 'Home Delivery' : 'Store Pickup'}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/profile')}>
                        <Text style={styles.primaryButtonText}>View My Orders</Text>
                        <ArrowRight size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={handleContinueShopping}>
                        <Home size={20} color={Colors.light.primary} />
                        <Text style={styles.secondaryButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        alignItems: 'center',
        paddingBottom: 40,
    },
    successIconContainer: {
        marginBottom: 24,
        marginTop: 40,
    },
    title: {
        fontSize: 28,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    orderInfoCard: {
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    orderLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    orderNumberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    orderNumber: {
        fontSize: 24,
        fontFamily: 'Lato_700Bold',
        color: '#1a1a1a',
        marginRight: 12,
    },
    copyButton: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    saveNote: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
    },
    detailsCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
    },
    detailsTitle: {
        fontSize: 18,
        fontFamily: 'Lato_700Bold',
        marginBottom: 16,
        color: '#1a1a1a',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 15,
        color: '#666',
    },
    detailValue: {
        fontSize: 15,
        fontFamily: 'Lato_700Bold',
        color: '#1a1a1a',
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        backgroundColor: Colors.light.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Lato_700Bold',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 8,
    },
    secondaryButtonText: {
        color: Colors.light.primary,
        fontSize: 16,
        fontFamily: 'Lato_700Bold',
    },
});
