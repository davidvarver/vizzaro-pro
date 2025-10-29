import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Package, Ruler } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('pickup');

  const subtotal = getCartTotal();
  const deliveryFee = deliveryOption === 'delivery' ? 15.00 : 0;
  const total = subtotal + deliveryFee;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ShoppingCart size={28} color={Colors.light.primary} />
        <Text style={styles.headerTitle}>Mi Carrito</Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingCart size={64} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptyText}>
            Explora nuestro catálogo y encuentra el papel tapiz perfecto para tu hogar
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.itemsContainer}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Image source={{ uri: item.wallpaper.imageUrl }} style={styles.itemImage} />
                
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.wallpaper.name}</Text>
                  
                  <View style={styles.purchaseTypeIndicator}>
                    {item.purchaseType === 'roll' ? (
                      <Package size={14} color={Colors.light.primary} />
                    ) : (
                      <Ruler size={14} color={Colors.light.primary} />
                    )}
                    <Text style={styles.purchaseTypeText}>
                      {item.purchaseType === 'roll' ? 'Por Rollo' : 'Por Medida'}
                    </Text>
                  </View>
                  
                  <Text style={styles.itemDetails}>
                    {item.rollsNeeded} rollo{item.rollsNeeded > 1 ? 's' : ''} • {item.wallArea.toFixed(1)}m²
                  </Text>
                  <Text style={styles.itemPrice}>
                    ${item.wallpaper.price.toFixed(2)} × {item.rollsNeeded} = ${(item.wallpaper.price * item.rollsNeeded).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.itemControls}>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, -1)}
                    >
                      <Minus size={16} color={Colors.light.primary} />
                    </TouchableOpacity>
                    <Text style={styles.quantity}>
                      {item.rollsNeeded}
                    </Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, 1)}
                    >
                      <Plus size={16} color={Colors.light.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Trash2 size={20} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>Opciones de Entrega</Text>
            
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryOption === 'pickup' && styles.deliveryOptionSelected
              ]}
              onPress={() => setDeliveryOption('pickup')}
            >
              <View style={styles.deliveryOptionContent}>
                <Text style={styles.deliveryOptionTitle}>Recoger en Tienda</Text>
                <Text style={styles.deliveryOptionSubtitle}>Gratis • Listo en 2 horas</Text>
              </View>
              <Text style={styles.deliveryPrice}>$0.00</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryOption === 'delivery' && styles.deliveryOptionSelected
              ]}
              onPress={() => setDeliveryOption('delivery')}
            >
              <View style={styles.deliveryOptionContent}>
                <Text style={styles.deliveryOptionTitle}>Entrega a Domicilio</Text>
                <Text style={styles.deliveryOptionSubtitle}>1-2 días hábiles</Text>
              </View>
              <Text style={styles.deliveryPrice}>$15.00</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Resumen del Pedido</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Entrega</Text>
              <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {cartItems.length > 0 && (
        <View style={styles.checkoutContainer}>
          <TouchableOpacity 
            style={styles.checkoutButton}
            onPress={() => router.push('/checkout')}
          >
            <CreditCard size={20} color={Colors.light.background} />
            <Text style={styles.checkoutButtonText}>
              Proceder al Pago • ${total.toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  },
  content: {
    flex: 1,
  },
  itemsContainer: {
    paddingHorizontal: 20,
  },
  cartItem: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  itemControls: {
    alignItems: 'center',
    gap: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    minWidth: 32,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  deliverySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  deliveryOption: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deliveryOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  deliveryOptionContent: {
    flex: 1,
  },
  deliveryOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  deliveryOptionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  deliveryPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  summarySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  checkoutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  checkoutButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  purchaseTypeText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
  },
});