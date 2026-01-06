import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';

type PaymentMethod = 'zelle' | 'credit_card';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();

  const cartItems = useCartStore((s) => s.cartItems);
  const contextClearCart = useCartStore((s) => s.clearCart);
  const createOrder = useOrdersStore((s) => s.createOrder);

  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getShippingCost = useCartStore((s) => s.getShippingCost);
  const getGrandTotal = useCartStore((s) => s.getGrandTotal);

  const subtotal = getSubtotal();
  const shipping = getShippingCost();
  const total = getGrandTotal();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');
  const [zelleReference, setZelleReference] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', address: '', city: '', zip: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlaceOrder = async () => {
    setErrorMessage('');

    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before checkout.');
      router.back();
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      const errorMsg = 'Please complete all shipping details.';
      setErrorMessage(errorMsg);
      if (Platform.OS !== 'web') Alert.alert('Missing Details', errorMsg);
      return;
    }

    if (paymentMethod === 'zelle' && !zelleReference.trim()) {
      const errorMsg = 'Please enter the Zelle confirmation number.';
      setErrorMessage(errorMsg);
      if (Platform.OS !== 'web') Alert.alert('Missing Reference', errorMsg);
      return;
    }

    setIsProcessing(true);

    try {
      await createOrder({
        items: cartItems,
        total,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerAddress: `${customerInfo.address}, ${customerInfo.city} ${customerInfo.zip}`,
        status: 'pending',
        deliveryMethod: 'delivery',
        paymentMethod,
        paymentReference: paymentMethod === 'zelle' ? zelleReference : `CC-${Date.now()}`,
      });

      contextClearCart();

      if (Platform.OS === 'web') {
        if (confirm('Order Confirmed! Thank you for your purchase.')) router.push('/');
        else router.push('/');
      } else {
        Alert.alert('Order Confirmed!', 'Thank you for your purchase.', [{ text: 'OK', onPress: () => router.push('/' as any) }]);
      }
    } catch (error) {
      console.error("Order error:", error);
      setErrorMessage('Error processing order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={Theme.colors.black} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CHECKOUT</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* SHIPPING */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SHIPPING ADDRESS</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput style={styles.input} placeholder="John Doe" value={customerInfo.name} onChangeText={t => setCustomerInfo({ ...customerInfo, name: t })} />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput style={styles.input} placeholder="email@example.com" keyboardType="email-address" value={customerInfo.email} onChangeText={t => setCustomerInfo({ ...customerInfo, email: t })} autoCapitalize="none" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>PHONE</Text>
                <TextInput style={styles.input} placeholder="(555) 000-0000" keyboardType="phone-pad" value={customerInfo.phone} onChangeText={t => setCustomerInfo({ ...customerInfo, phone: t })} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ADDRESS</Text>
              <TextInput style={styles.input} placeholder="123 Street Name" value={customerInfo.address} onChangeText={t => setCustomerInfo({ ...customerInfo, address: t })} />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 16 }]}>
                <Text style={styles.label}>CITY</Text>
                <TextInput style={styles.input} placeholder="City" value={customerInfo.city} onChangeText={t => setCustomerInfo({ ...customerInfo, city: t })} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>ZIP CODE</Text>
                <TextInput style={styles.input} placeholder="00000" keyboardType="numeric" value={customerInfo.zip} onChangeText={t => setCustomerInfo({ ...customerInfo, zip: t })} />
              </View>
            </View>
          </View>

          {/* PAYMENT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>

            <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'zelle' && styles.paymentActive]} onPress={() => setPaymentMethod('zelle')}>
              <View style={styles.radio}>
                {paymentMethod === 'zelle' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.paymentText}>Zelle Transfer</Text>
            </TouchableOpacity>

            {paymentMethod === 'zelle' && (
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentInstruction}>Please send Zelle payment to <Text style={{ fontFamily: Theme.typography.fontFamily.sansBold }}>payments@vizzaro.com</Text></Text>
                <Text style={styles.label}>REFERENCE NUMBER</Text>
                <TextInput style={styles.input} placeholder="Enter Zelle Confirmation #" value={zelleReference} onChangeText={setZelleReference} />
              </View>
            )}

            <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'credit_card' && styles.paymentActive]} onPress={() => setPaymentMethod('credit_card')}>
              <View style={styles.radio}>
                {paymentMethod === 'credit_card' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.paymentText}>Credit Card</Text>
            </TouchableOpacity>

            {paymentMethod === 'credit_card' && (
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentInstruction}>Credit card payments are temporarily unavailable. Please use Zelle.</Text>
              </View>
            )}
          </View>

          {/* ERROR */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        </ScrollView>

        {/* FOOTER */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryVal}>${shipping.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutBtn, isProcessing && styles.btnDisabled]}
            onPress={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator color="white" /> : <Text style={styles.checkoutBtnText}>PLACE ORDER</Text>}
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.white },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Theme.colors.border
  },
  backBtn: {},
  headerTitle: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 18, letterSpacing: 1 },

  scrollContent: { padding: 24 },

  section: { marginBottom: 40 },
  sectionTitle: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 18, marginBottom: 20, letterSpacing: 0.5 },

  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontFamily: Theme.typography.fontFamily.sansBold, fontSize: 11, marginBottom: 6, letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 0,
    paddingVertical: 12, paddingHorizontal: 12, fontSize: 14, fontFamily: Theme.typography.fontFamily.sans
  },

  paymentOption: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 12, gap: 12
  },
  paymentActive: { borderColor: Theme.colors.black, backgroundColor: '#f9f9f9' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.black,
    justifyContent: 'center', alignItems: 'center'
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.colors.black },
  paymentText: { fontFamily: Theme.typography.fontFamily.sansBold, fontSize: 14 },

  paymentDetails: { padding: 16, backgroundColor: Theme.colors.backgroundSecondary, marginBottom: 20 },
  paymentInstruction: { fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 12 },

  errorText: { color: Theme.colors.error, marginBottom: 20, textAlign: 'center', fontSize: 13 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 14, color: Theme.colors.textSecondary },
  summaryVal: { fontSize: 14, fontFamily: Theme.typography.fontFamily.sansBold },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  totalLabel: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 16 },
  totalVal: { fontFamily: Theme.typography.fontFamily.serifBold, fontSize: 20 },

  checkoutBtn: { backgroundColor: Theme.colors.black, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  checkoutBtnText: { color: Theme.colors.white, fontFamily: Theme.typography.fontFamily.sansBold, letterSpacing: 1 },
  btnDisabled: { opacity: 0.7 },
});