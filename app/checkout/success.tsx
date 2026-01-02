import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Home, ShoppingBag, Copy, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';
import { useOrders } from '@/contexts/OrdersContext';

export default function OrderSuccessScreen() {
    const router = useRouter();
    const { orderId } = useLocalSearchParams();
    const { orders } = useOrders();
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
            alert('Número de orden copiado al portapapeles');
        }
    };

    const handleContinueShopping = () => {
        router.push('/(tabs)/home');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.successIconContainer}>
                    <CheckCircle size={80} color="#10B981" fill="#D1FAE5" />
                </View>

                <Text style={styles.title}>¡Gracias por tu compra!</Text>
                <Text style={styles.subtitle}>
                    Tu pedido ha sido recibido y estamos procesándolo.
                    {order?.customerEmail ? ` Enviamos un correo de confirmación a ${order.customerEmail}.` : ''}
                </Text>

                <View style={styles.orderInfoCard}>
                    <Text style={styles.orderLabel}>Número de Orden</Text>
                    <View style={styles.orderNumberContainer}>
                        <Text style={styles.orderNumber}>#{orderId}</Text>
                        <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                            <Copy size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.saveNote}>
                        Guarda este número para rastrear tu pedido.
                    </Text>
                </View>

                {order && (
                    <View style={styles.detailsCard}>
                        <Text style={styles.detailsTitle}>Resumen</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Total Pagado</Text>
                            <Text style={styles.detailValue}>${order.total.toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Método de Pago</Text>
                            <Text style={styles.detailValue}>
                                {order.paymentMethod === 'zelle' ? 'Zelle Transfer' : 'Tarjeta de Crédito'}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Entrega</Text>
                            <Text style={styles.detailValue}>
                                {order.deliveryMethod === 'delivery' ? 'Envío a Domicilio' : 'Recoger en Tienda'}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/profile')}>
                        <Text style={styles.primaryButtonText}>Ver Mis Pedidos</Text>
                        <ArrowRight size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={handleContinueShopping}>
                        <Home size={20} color={Colors.primary} />
                        <Text style={styles.secondaryButtonText}>Volver al Inicio</Text>
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
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        shadowColor: Colors.primary,
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
        color: Colors.primary,
        fontSize: 16,
        fontFamily: 'Lato_700Bold',
    },
});
