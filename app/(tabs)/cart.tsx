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
  const [deliveryOption, setDeliveryOption] = useState<'delivery'>('delivery');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const subtotal = getCartTotal();
  const deliveryFee = deliveryOption === 'delivery' ? 15.00 : 0;
  const total = subtotal + deliveryFee;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ShoppingCart size={28} color={Colors.light.primary} />
        <Text style={styles.headerTitle}>My Cart</Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingCart size={64} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Browse our catalog to find the perfect wallpaper for your home
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
                      {item.purchaseType === 'roll' ? 'By Roll' : 'Custom Size'}
                    </Text>
                  </View>

                  <Text style={styles.itemDetails}>
                    {item.rollsNeeded} roll{item.rollsNeeded > 1 ? 's' : ''} • {item.wallArea.toFixed(1)}m²
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
            <Text style={styles.sectionTitle}>Delivery Options</Text>

            <View
              style={[
                styles.deliveryOption,
                styles.deliveryOptionSelected
              ]}
            >
              <View style={styles.deliveryOptionContent}>
                <Text style={styles.deliveryOptionTitle}>Home Delivery</Text>
                <Text style={styles.deliveryOptionSubtitle}>Shipping nationwide</Text>
              </View>
              <Text style={styles.deliveryPrice}>$15.00</Text>
            </View>
          </View>



          // ... (inside return, before Checkout button)

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>

            {/* Terms and Conditions Checkbox */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && <View style={styles.checkboxInner} />}
                </View>
              </TouchableOpacity>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  I have read and agree to the <Text style={styles.linkText} onPress={() => router.push('/terms-of-sale')}>Terms and Conditions</Text>.
                </Text>
                <Text style={styles.termsSubtext}>
                  I understand there are no returns on custom products.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {cartItems.length > 0 && (
        <View style={styles.checkoutContainer}>
          <TouchableOpacity
            style={[styles.checkoutButton, !acceptedTerms && styles.checkoutButtonDisabled]}
            disabled={!acceptedTerms}
            onPress={() => router.push('/checkout')}
          >
            <CreditCard size={20} color={acceptedTerms ? Colors.light.background : Colors.light.textSecondary} />
            <Text style={[styles.checkoutButtonText, !acceptedTerms && styles.checkoutButtonTextDisabled]}>
              Proceed to Checkout • ${total.toFixed(2)}
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
  termsContainer: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  checkboxContainer: {
    paddingTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: Colors.light.background,
    borderRadius: 2,
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  linkText: {
    color: Colors.light.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  termsSubtext: {
    fontSize: 12,
    color: Colors.light.error, // Red for warning
    marginTop: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  checkoutButtonTextDisabled: {
    color: Colors.light.textSecondary,
  },
});