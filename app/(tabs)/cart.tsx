import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@/store/useCartStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function CartScreen() {
    const router = useRouter();
    const { cartItems, removeFromCart, updateQuantity, getGrandTotal, initialize } = useCartStore();

    useEffect(() => {
        initialize();
    }, []);

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            Alert.alert('Carrito Vacío', 'Agrega productos antes de continuar.');
            return;
        }
        router.push('/checkout');
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.itemContainer}>
            <Image source={{ uri: item.wallpaper.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.details}>
                <Text style={styles.name} numberOfLines={1}>{item.wallpaper.name}</Text>
                <Text style={styles.type}>
                    {item.purchaseType === 'sample' ? 'Muestra' : 'Rollos'}
                </Text>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>
                        ${(item.purchaseType === 'sample' ? 5.00 : item.wallpaper.price).toFixed(2)}
                    </Text>
                    {item.purchaseType === 'roll' && (
                        <Text style={styles.subtext}>x{item.rollsNeeded} rollos</Text>
                    )}
                </View>
            </View>

            <View style={styles.actions}>
                <View style={styles.quantityControls}>
                    <TouchableOpacity
                        onPress={() => updateQuantity(item.id, -1)}
                        style={styles.qtyBtn}
                    >
                        <Ionicons name="remove" size={16} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                        onPress={() => updateQuantity(item.id, 1)}
                        style={styles.qtyBtn}
                    >
                        <Ionicons name="add" size={16} color="black" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const total = getGrandTotal();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mi Carrito</Text>
            </View>

            {cartItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Tu carrito está vacío</Text>
                    <TouchableOpacity onPress={() => router.push('/')} style={styles.shopBtn}>
                        <Text style={styles.shopBtnText}>Ir al Catálogo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={cartItems}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                    />
                    <View style={styles.footer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                            <Text style={styles.checkoutText}>Proceder al Pago</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    list: {
        padding: 15,
    },
    itemContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    image: {
        width: 70,
        height: 70,
        borderRadius: 6,
        marginRight: 10,
        backgroundColor: '#f0f0f0',
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    type: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    price: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.light.tint,
    },
    subtext: {
        fontSize: 12,
        color: '#888',
    },
    actions: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        padding: 2,
    },
    qtyBtn: {
        padding: 6,
    },
    qtyText: {
        marginHorizontal: 8,
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 5,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
        marginBottom: 20,
    },
    shopBtn: {
        backgroundColor: Colors.light.tint,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    shopBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.tint,
    },
    checkoutBtn: {
        backgroundColor: Colors.light.tint,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    checkoutText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
