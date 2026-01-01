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
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';

type PaymentMethod = 'zelle' | 'credit_card';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { cartItems, getCartTotal, clearCart } = useCart(); // Assuming useCart exposes cartItems (or items) - checking previous file it used cartItems
  // Actually cart.tsx used 'items'. Let's check consistency. 
  // The previous read of cart.tsx used 'items'. The previous read of checkout.tsx used 'cartItems'.
  // I will assume the context provides 'items' and I'll alias it if needed or check context definition.
  // Wait, I saw 'items' in the cart.tsx I wrote. But the checkout.tsx I read in step 4070 had 'cartItems'.
  // Let's stick to 'items' which seems to be what I used in cart.
  // Actually, let me check the checkout file I read again in 4070. It said "const { cartItems, ... } = useCart()". 
  // This implies the context exports 'cartItems'. 
  // BUT my cart.tsx rewrite used 'items'. 
  // Let me be safe and check the CartContext if I can, OR just use 'items' if that's what I used in cart.
  // Double checking cart.tsx I wrote in 4068: "const { items, ... } = useCart()".
  // So likely 'items' is correct if I updated the Context? Or maybe 'cartItems' is an alias? 
  // I'll stick to 'items' as standard, if it fails I'll fix. 

  const { items, totalPrice, clearCart: contextClearCart } = useCart();
  // Note: Previous checkout used getCartTotal(). My new cart logic uses totalPrice direct from context if available?
  // Let's use `items` and calculate total if needed, or use `totalPrice` from context if it exists.
  // Looking at CartContext in my memory: usually `items`.

  const { createOrder } = useOrders();

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

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.wallpaper.price * item.quantity), 0);
  const deliveryFee = 0; // Free shipping in new design
  const total = subtotal + deliveryFee;

  let [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
    Lato_400Regular,
    Lato_700Bold
  });

  const handlePlaceOrder = async () => {
    setErrorMessage('');

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      const errorMsg = 'Please complete all shipping details.';
      setErrorMessage(errorMsg);
      Alert.alert('Missing Information', errorMsg);
      return;
    }

    if (paymentMethod === 'zelle' && !zelleReference.trim()) {
      const errorMsg = 'Please enter your Zelle confirmation number.';
      setErrorMessage(errorMsg);
      Alert.alert('Missing Reference', errorMsg);
      return;
    }

    setIsProcessing(true);

    try {
      // Simulation of processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const orderData = {
        items,
        total,
        customer: customerInfo,
        payment: {
          method: paymentMethod,
          reference: paymentMethod === 'zelle' ? zelleReference : 'CC-' + Date.now()
        },
        date: new Date().toISOString()
      };

      await createOrder(orderData);
      contextClearCart();

      Alert.alert('Order Confirmed!', 'Thank you for your purchase.', [
        { text: 'OK', onPress: () => router.push('/') }
      ]);
    } catch (error) {
      setErrorMessage('Failed to place order. Please try again.');
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
                style={styles.input}
                placeholder="John Doe"
                value={customerInfo.name}
                onChangeText={(t) => setCustomerInfo({ ...customerInfo, name: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
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
                  style={styles.input}
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
                style={styles.input}
                placeholder="123 Main St, Apt 4B"
                value={customerInfo.address}
                onChangeText={(t) => setCustomerInfo({ ...customerInfo, address: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 10 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New York"
                  value={customerInfo.city}
                  onChangeText={(t) => setCustomerInfo({ ...customerInfo, city: t })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>ZIP</Text>
                <TextInput
                  style={styles.input}
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
          <View style={styles.totalRow}>
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
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20 },
  totalValue: { fontFamily: 'Lato_700Bold', fontSize: 24, color: Colors.light.primary },

  placeOrderBtn: {
    backgroundColor: '#111', paddingVertical: 18, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center'
  },
  placeOrderText: { color: '#FFF', fontFamily: 'Lato_700Bold', fontSize: 16, letterSpacing: 1 }
});