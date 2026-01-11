
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function CheckoutScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const { cartItems, getGrandTotal, clearCart, getShippingCost } = useCartStore();
    const { createOrder } = useOrdersStore();

    const [form, setForm] = useState({
        name: '',
        email: '',
        address: '',
        city: '',
        zip: '',
        phone: '',
    });

    const [paymentMethod, setPaymentMethod] = useState<'zelle' | 'credit_card'>('zelle');

    const total = getGrandTotal();
    const shipping = getShippingCost();

    const handleCreateOrder = async () => {
        if (!form.name || !form.email || !form.address) {
            Alert.alert('Missing Info', 'Please fill in required fields.');
            return;
        }

        setIsLoading(true);
        try {
            const orderData = {
                customerName: form.name,
                customerEmail: form.email,
                customerPhone: form.phone,
                customerAddress: `${form.address}, ${form.city} ${form.zip}`,
                items: cartItems,
                total: total,
                status: 'pending' as const,
                deliveryMethod: 'delivery' as const,
                paymentMethod: paymentMethod
            };

            const orderId = await createOrder(orderData);
            clearCart();
            setIsLoading(false);

            // Navigate to success screen
            router.replace({
                pathname: '/checkout/success' as any,
                params: { orderId }
            });

        } catch (error) {
            console.error(error);
            setIsLoading(false);
            Alert.alert('Error', 'Could not create order. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.title}>CHECKOUT</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SHIPPING INFO</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        value={form.name}
                        onChangeText={(t) => setForm({ ...form, name: t })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={(t) => setForm({ ...form, email: t })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Phone"
                        keyboardType="phone-pad"
                        value={form.phone}
                        onChangeText={(t) => setForm({ ...form, phone: t })}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Address"
                        value={form.address}
                        onChangeText={(t) => setForm({ ...form, address: t })}
                    />
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="City"
                            value={form.city}
                            onChangeText={(t) => setForm({ ...form, city: t })}
                        />
                        <TextInput
                            style={[styles.input, styles.halfInput]}
                            placeholder="Zip Code"
                            value={form.zip}
                            onChangeText={(t) => setForm({ ...form, zip: t })}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
                    <View style={styles.paymentOptions}>
                        <TouchableOpacity
                            style={[styles.paymentOption, paymentMethod === 'zelle' && styles.paymentOptionActive]}
                            onPress={() => setPaymentMethod('zelle')}
                        >
                            <Text style={[styles.paymentText, paymentMethod === 'zelle' && styles.paymentTextActive]}>Zelle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.paymentOption, paymentMethod === 'credit_card' && styles.paymentOptionActive]}
                            onPress={() => setPaymentMethod('credit_card')}
                        >
                            <Text style={[styles.paymentText, paymentMethod === 'credit_card' && styles.paymentTextActive]}>Credit Card</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.summary}>
                    <Text style={styles.sectionTitle}>SUMMARY</Text>
                    <View style={styles.summaryRow}>
                        <Text>Subtotal</Text>
                        <Text>${(total - shipping).toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text>Shipping</Text>
                        <Text>${shipping.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalText}>Total</Text>
                        <Text style={styles.totalText}>${total.toFixed(2)}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.placeOrderBtn, isLoading && styles.disabledBtn]}
                    onPress={handleCreateOrder}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.placeOrderText}>PLACE ORDER</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
        letterSpacing: 1,
        marginBottom: 16,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        marginBottom: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    paymentOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    paymentOption: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentOptionActive: {
        borderColor: '#000',
        backgroundColor: '#000',
    },
    paymentText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    paymentTextActive: {
        color: '#fff',
    },
    summary: {
        backgroundColor: '#f9f9f9',
        padding: 20,
        borderRadius: 12,
        marginBottom: 32,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    totalRow: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    totalText: {
        fontSize: 18,
        fontWeight: '700',
    },
    placeOrderBtn: {
        backgroundColor: '#000',
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    placeOrderText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
});
