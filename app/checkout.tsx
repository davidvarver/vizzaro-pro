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
import {
  ArrowLeft,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Truck
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';

type PaymentMethod = 'zelle' | 'credit_card';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getShippingCost = useCartStore((s) => s.getShippingCost);
  const getGrandTotal = useCartStore((s) => s.getGrandTotal);

  const cartItems = useCartStore((s) => s.cartItems);
  const contextClearCart = useCartStore((s) => s.clearCart);

  const items = cartItems || [];
  const createOrder = useOrdersStore((s) => s.createOrder);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');
  const [zelleReference, setZelleReference] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: ''
  });

  const [creditCardInfo, setCreditCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const subtotal = getSubtotal();
  const shipping = getShippingCost();
  const total = getGrandTotal();

  let [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
    Lato_400Regular,
    Lato_700Bold
  });

  const handlePlaceOrder = async () => {
    setErrorMessage('');

    if (items.length === 0) {
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
      const orderData = {
        items,
        total, // Grand Total
        // Flat customer properties to match Order interface
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerAddress: `${customerInfo.address}, ${customerInfo.city} ${customerInfo.zip}`,
        status: 'pending' as const,
        deliveryMethod: 'delivery' as const,
        paymentMethod,
        paymentReference: paymentMethod === 'zelle' ? zelleReference : `CC-${Date.now()}`,
      };

      // Create order
      await createOrder(orderData);
      contextClearCart();

      // Success handling
      if (Platform.OS === 'web') {
        // Web doesn't handle Alert in the same way, sometimes better to just route
        if (window.confirm('Order Confirmed! Thank you for your purchase.\n\nPress OK to return home.')) {
          router.push('/');
        } else {
          router.push('/');
        }
      } else {
        Alert.alert('Order Confirmed!', 'Thank you for your purchase.', [
          { text: 'OK', onPress: () => router.push('/') }
        ]);
      }
    } catch (error) {
      console.error("Order error:", error);
      setErrorMessage('Error processing order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>

          {/* SHIPPING SECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errorMessage && !customerInfo.name && styles.inputError]}
                placeholder="John Doe"
                value={customerInfo.name}
                onChangeText={(t) => setCustomerInfo({ ...customerInfo, name: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errorMessage && !customerInfo.email && styles.inputError]}
                  placeholder="john@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customerInfo.email}
                  onChangeText={(t) => setCustomerInfo({ ...customerInfo, email: t })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={[styles.input, errorMessage && !customerInfo.phone && styles.inputError]}
                  placeholder="(555) 123-4567"
                  keyboardType="phone-pad"
                  value={customerInfo.phone}
                  onChangeText={(t) => setCustomerInfo({ ...customerInfo, phone: t })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, errorMessage && !customerInfo.address && styles.inputError]}
                placeholder="123 Main St, Apt 4B"
                value={customerInfo.address}
                onChangeText={(t) => setCustomerInfo({ ...customerInfo, address: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 10 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={[styles.input, errorMessage && !customerInfo.city && styles.inputError]}
                  placeholder="New York"
                  value={customerInfo.city}
                  onChangeText={(t) => setCustomerInfo({ ...customerInfo, city: t })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>ZIP</Text>
                <TextInput
                  style={[styles.input, errorMessage && !customerInfo.zip && styles.inputError]}
                  placeholder="10001"
                  keyboardType="numeric"
                  value={customerInfo.zip}
                  onChangeText={(t) => setCustomerInfo({ ...customerInfo, zip: t })}
                />
              </View>
            </View>
          </View>

          {/* PAYMENT METHOD */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'zelle' && styles.paymentOptionActive]}
                onPress={() => setPaymentMethod('zelle')}
              >
                <View style={styles.radioOuter}>
                  {paymentMethod === 'zelle' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentText}>Zelle Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentOption, paymentMethod === 'credit_card' && styles.paymentOptionActive]}
                onPress={() => setPaymentMethod('credit_card')}
              >
                <View style={styles.radioOuter}>
                  {paymentMethod === 'credit_card' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentText}>Credit Card</Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === 'zelle' ? (
              <View style={styles.zelleInfo}>
                <Text style={styles.zelleInstructions}>
                  Send payment to <Text style={{ fontWeight: 'bold' }}>payments@vizzaro.com</Text>
                </Text>
                <Text style={styles.label}>Zelle Confirmation #</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter reference number"
                  value={zelleReference}
                  onChangeText={setZelleReference}
                />
              </View>
            ) : (
              <View style={styles.cardForm}>
                <TextInput style={styles.input} placeholder="Card Number" keyboardType="numeric" />
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="MM/YY" />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="CVV" keyboardType="numeric" />
                </View>
              </View>
            )}
          </View>

          {/* MESSAGE */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        </ScrollView>

        {/* FOOTER */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          {shipping > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeOrderBtn, isProcessing && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.placeOrderText}>PLACE ORDER</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#111' },

  content: { padding: 20, paddingBottom: 100 },

  section: { marginBottom: 30 },
  sectionTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, marginBottom: 20, color: '#111' },

  inputGroup: { marginBottom: 15 },
  label: { fontFamily: 'Lato_700Bold', fontSize: 13, color: '#444', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 4,
    paddingVertical: 12, paddingHorizontal: 15,
    fontFamily: 'Lato_400Regular', fontSize: 16, color: '#000',
    backgroundColor: '#FFF'
  },
  inputError: {
    borderColor: Colors.light.error,
    borderWidth: 1.5,
    backgroundColor: '#FFF0F0'
  },
  row: { flexDirection: 'row', marginBottom: 15 },

  paymentOptions: { marginBottom: 20 },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: 15, borderWidth: 1, borderColor: '#DDD', borderRadius: 4,
    marginBottom: 10
  },
  paymentOptionActive: { borderColor: Colors.light.primary, backgroundColor: '#F9F9F9' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#666',
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.primary },
  paymentText: { fontFamily: 'Lato_700Bold', fontSize: 16 },

  zelleInfo: { padding: 15, backgroundColor: '#F5F5F5', borderRadius: 4 },
  zelleInstructions: { fontFamily: 'Lato_400Regular', marginBottom: 15, color: '#666' },
  cardForm: { padding: 10 },

  errorText: { color: 'red', textAlign: 'center', marginBottom: 20, fontFamily: 'Lato_400Regular' },

  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: '#EEE',
    backgroundColor: '#FFF',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  summaryLabel: { fontFamily: 'Lato_400Regular', fontSize: 16, color: '#666' },
  summaryValue: { fontFamily: 'Lato_700Bold', fontSize: 16, color: '#333' },

  totalLabel: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20 },
  totalValue: { fontFamily: 'Lato_700Bold', fontSize: 24, color: Colors.light.primary },

  placeOrderBtn: {
    backgroundColor: '#111', paddingVertical: 18, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center', marginTop: 15
  },
  placeOrderText: { color: '#FFF', fontFamily: 'Lato_700Bold', fontSize: 16, letterSpacing: 1 }
});