import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Theme } from '@/constants/theme';
import { useCartStore } from '@/store/useCartStore';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);

  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getShippingCost = useCartStore((state) => state.getShippingCost);
  const getGrandTotal = useCartStore((state) => state.getGrandTotal);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const subtotal = getSubtotal();
  const shippingCost = getShippingCost();
  const total = getGrandTotal();

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>YOUR SHOPPING BAG IS VIDE.</Text>
        <Text style={styles.emptyText}>You haven't added any items yet.</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/catalog' as any)}>
          <Text style={styles.shopBtnText}>CONTINUE SHOPPING</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SHOPPING BAG ({cartItems.length})</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, { flex: 3 }]}>ITEM</Text>
          <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>QTY</Text>
          <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
        </View>

        {cartItems.map((item) => (
          <View key={item.id} style={styles.row}>
            {/* Image & details */}
            <View style={styles.itemCol}>
              <Image source={{ uri: item.wallpaper.imageUrl }} style={styles.itemImg} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.wallpaper.name}</Text>
                <Text style={styles.itemSku}>Item: {item.wallpaper.publicSku || 'VIZ-001'}</Text>
                <Text style={styles.unitPrice}>${item.wallpaper.price.toFixed(2)} / {item.purchaseType === 'sample' ? 'Sample' : 'Roll'}</Text>
                {item.purchaseType === 'roll' && (
                  <Text style={styles.coverage}>Covers approx {item.wallArea.toFixed(1)} sq ft</Text>
                )}
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.qtyCol}>
              <View style={styles.qtyControl}>
                <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                  <Minus size={12} color={Theme.colors.black} />
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{item.purchaseType === 'sample' ? item.quantity : item.rollsNeeded}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                  <Plus size={12} color={Theme.colors.black} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Total */}
            <View style={styles.priceCol}>
              <Text style={styles.priceVal}>
                ${(item.wallpaper.price * (item.purchaseType === 'sample' ? item.quantity : item.rollsNeeded)).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SUBTOTAL</Text>
            <Text style={styles.summaryVal}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SHIPPING</Text>
            <Text style={styles.summaryVal}>${shippingCost.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>ESTIMATED TOTAL</Text>
            <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsBox}>
          <TouchableOpacity style={styles.checkbox} onPress={() => setAcceptedTerms(!acceptedTerms)}>
            {acceptedTerms && <View style={styles.checkboxInner} />}
          </TouchableOpacity>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.link}>Terms & Conditions</Text>. I understand custom orders are final sale.
          </Text>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkoutBtn, !acceptedTerms && styles.disabledBtn]}
          disabled={!acceptedTerms}
          onPress={() => router.push('/checkout' as any)}
        >
          <Text style={styles.checkoutText}>PROCEED TO CHECKOUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.white },

  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerTitle: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 24, letterSpacing: 1 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.white },
  emptyTitle: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 20, marginBottom: 12 },
  emptyText: { fontFamily: Theme.typography.fontFamily.sans, fontSize: 14, color: Theme.colors.textSecondary, marginBottom: 24 },
  shopBtn: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Theme.colors.black },
  shopBtnText: { color: Theme.colors.white, fontFamily: Theme.typography.fontFamily.sansBold, letterSpacing: 1 },

  content: { flex: 1 },

  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  colHeader: { fontSize: 11, fontFamily: Theme.typography.fontFamily.sansBold, color: Theme.colors.textSecondary },

  row: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },

  itemCol: { flex: 3, flexDirection: 'row', gap: 16 },
  itemImg: { width: 60, height: 80, backgroundColor: '#f0f0f0' },
  itemDetails: { flex: 1 },
  itemName: { fontFamily: Theme.typography.fontFamily.serif, fontSize: 16, marginBottom: 4 },
  itemSku: { fontSize: 11, color: Theme.colors.textSecondary, marginBottom: 4 },
  unitPrice: { fontSize: 12, fontFamily: Theme.typography.fontFamily.sansMedium },
  coverage: { fontSize: 10, color: Theme.colors.textSecondary, marginTop: 4 },

  qtyCol: { flex: 1, alignItems: 'center', gap: 8 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, height: 32 },
  qtyBtn: { width: 24, height: '100%', alignItems: 'center', justifyContent: 'center' },
  qtyVal: { width: 24, textAlign: 'center', fontSize: 12, fontFamily: Theme.typography.fontFamily.sansBold },
  removeBtn: {},
  removeText: { fontSize: 10, textDecorationLine: 'underline', color: Theme.colors.textSecondary },

  priceCol: { flex: 1, alignItems: 'flex-end' },
  priceVal: { fontFamily: Theme.typography.fontFamily.sansBold, fontSize: 14 },

  summarySection: { padding: 24, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, fontFamily: Theme.typography.fontFamily.sans },
  summaryVal: { fontSize: 14, fontFamily: Theme.typography.fontFamily.sansBold },
  totalRow: { borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 16, marginTop: 8 },
  totalLabel: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 16 },
  totalVal: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 20 },

  termsBox: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: Theme.colors.black, padding: 3 },
  checkboxInner: { flex: 1, backgroundColor: Theme.colors.black },
  termsText: { flex: 1, fontSize: 12, color: Theme.colors.textSecondary, lineHeight: 18 },
  link: { textDecorationLine: 'underline', color: Theme.colors.black },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  checkoutBtn: { backgroundColor: Theme.colors.black, paddingVertical: 18, alignItems: 'center' },
  checkoutText: { color: Theme.colors.white, fontFamily: Theme.typography.fontFamily.sansBold, letterSpacing: 1.5, fontSize: 13 },
  disabledBtn: { opacity: 0.5 },
});