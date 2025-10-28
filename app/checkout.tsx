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
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrdersContext';

type PaymentMethod = 'zelle' | 'credit_card';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { createOrder } = useOrders();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');
  const [zelleReference, setZelleReference] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  const [creditCardInfo, setCreditCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const subtotal = getCartTotal();
  const deliveryFee = 15.00;
  const total = subtotal + deliveryFee;

  const generateZelleReference = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `VZWP-${timestamp.slice(-6)}-${random}`;
  };

  React.useEffect(() => {
    if (paymentMethod === 'zelle' && !zelleReference) {
      const newReference = generateZelleReference();
      setZelleReference(newReference);
    }
  }, [paymentMethod, zelleReference]);

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      if (Platform.OS !== 'web') {
        Alert.alert('Información Incompleta', 'Por favor completa todos los campos requeridos.');
      }
      return;
    }

    if (paymentMethod === 'credit_card') {
      if (!creditCardInfo.cardNumber || !creditCardInfo.expiryDate || !creditCardInfo.cvv || !creditCardInfo.cardholderName) {
        if (Platform.OS !== 'web') {
          Alert.alert('Información de Tarjeta Incompleta', 'Por favor completa todos los campos de la tarjeta.');
        }
        return;
      }
    }

    const finalZelleReference = paymentMethod === 'zelle' ? zelleReference : undefined;

    try {
      await createOrder({
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        customerAddress: customerInfo.address || 'N/A',
        items: cartItems,
        total,
        status: 'pending',
        deliveryMethod: customerInfo.address ? 'delivery' : 'pickup',
        notes: paymentMethod === 'zelle' ? 'Pago por Zelle' : 'Pago con tarjeta',
        paymentMethod,
        zelleReference: finalZelleReference,
        zelleConfirmed: false,
      });

      const confirmMessage = paymentMethod === 'zelle' 
        ? `Tu pedido ha sido recibido.\n\nCódigo de Referencia: ${finalZelleReference}\n\nEnvía el pago a: 7326646800\nMonto: ${total.toFixed(2)}\n\nIMPORTANTE: Incluye el código de referencia en la nota del pago.`
        : 'Tu pedido ha sido procesado exitosamente. Recibirás un email de confirmación.';

      if (Platform.OS !== 'web') {
        Alert.alert(
          'Pedido Confirmado',
          confirmMessage,
          [
            {
              text: 'OK',
              onPress: () => {
                clearCart();
                router.replace('/(tabs)/home');
              }
            }
          ]
        );
      } else {
        alert(`Pedido Confirmado\n\n${confirmMessage}`);
        clearCart();
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Hubo un problema al procesar tu pedido. Por favor intenta de nuevo.');
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Cliente</Text>
          
          <View style={styles.inputContainer}>
            <User size={20} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="Nombre completo *"
              value={customerInfo.name}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, name: text }))}
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Mail size={20} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={customerInfo.email}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Phone size={20} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="Teléfono *"
              value={customerInfo.phone}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MapPin size={20} color={Colors.light.primary} />
            <TextInput
              style={styles.input}
              placeholder="Dirección de entrega"
              value={customerInfo.address}
              onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, address: text }))}
              multiline
              placeholderTextColor={Colors.light.textSecondary}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de Pago</Text>
          
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'zelle' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('zelle')}
          >
            <View style={styles.paymentOptionContent}>
              <DollarSign size={24} color={paymentMethod === 'zelle' ? Colors.light.primary : Colors.light.textSecondary} />
              <View style={styles.paymentOptionText}>
                <Text style={[
                  styles.paymentOptionTitle,
                  paymentMethod === 'zelle' && styles.paymentOptionTitleSelected
                ]}>Zelle</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pago rápido y seguro con Zelle
                </Text>
              </View>
            </View>
            {paymentMethod === 'zelle' && (
              <CheckCircle size={20} color={Colors.light.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'credit_card' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('credit_card')}
          >
            <View style={styles.paymentOptionContent}>
              <CreditCard size={24} color={paymentMethod === 'credit_card' ? Colors.light.primary : Colors.light.textSecondary} />
              <View style={styles.paymentOptionText}>
                <Text style={[
                  styles.paymentOptionTitle,
                  paymentMethod === 'credit_card' && styles.paymentOptionTitleSelected
                ]}>Tarjeta de Crédito</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Visa, Mastercard, American Express
                </Text>
              </View>
            </View>
            {paymentMethod === 'credit_card' && (
              <CheckCircle size={20} color={Colors.light.primary} />
            )}
          </TouchableOpacity>

          {paymentMethod === 'zelle' && (
            <View style={styles.zelleInfo}>
              <Text style={styles.zelleInfoTitle}>Información de Pago Zelle:</Text>
              <Text style={styles.zelleInfoText}>
                Envía el pago a: <Text style={styles.zelleNumber}>7326646800</Text>
              </Text>
              <Text style={styles.zelleInfoText}>
                Monto: <Text style={styles.zelleNumber}>${total.toFixed(2)}</Text>
              </Text>
              
              {zelleReference && (
                <View style={styles.referenceBox}>
                  <Text style={styles.referenceLabel}>Tu Código de Referencia:</Text>
                  <View style={styles.referenceCodeContainer}>
                    <Text style={styles.referenceCode}>{zelleReference}</Text>
                  </View>
                  <Text style={styles.referenceSubtext}>
                    Copia este código para incluirlo en la nota del pago Zelle.
                  </Text>
                </View>
              )}

              <View style={styles.zelleWarning}>
                <Text style={styles.zelleWarningTitle}>⚠️ Importante</Text>
                <Text style={styles.zelleWarningText}>
                  Debes incluir el código de referencia <Text style={styles.zelleWarningBold}>{zelleReference}</Text> en la nota o descripción de tu pago Zelle. Esto nos permite identificar y procesar tu pedido automáticamente.
                </Text>
              </View>
            </View>
          )}

          {paymentMethod === 'credit_card' && (
            <View style={styles.creditCardForm}>
              <View style={styles.inputContainer}>
                <CreditCard size={20} color={Colors.light.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Número de tarjeta *"
                  value={creditCardInfo.cardNumber}
                  onChangeText={(text) => setCreditCardInfo(prev => ({ ...prev, cardNumber: text }))}
                  keyboardType="numeric"
                  maxLength={19}
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
              
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/AA *"
                    value={creditCardInfo.expiryDate}
                    onChangeText={(text) => setCreditCardInfo(prev => ({ ...prev, expiryDate: text }))}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholderTextColor={Colors.light.textSecondary}
                  />
                </View>
                
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <TextInput
                    style={styles.input}
                    placeholder="CVV *"
                    value={creditCardInfo.cvv}
                    onChangeText={(text) => setCreditCardInfo(prev => ({ ...prev, cvv: text }))}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholderTextColor={Colors.light.textSecondary}
                  />
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.light.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Nombre en la tarjeta *"
                  value={creditCardInfo.cardholderName}
                  onChangeText={(text) => setCreditCardInfo(prev => ({ ...prev, cardholderName: text }))}
                  placeholderTextColor={Colors.light.textSecondary}
                />
              </View>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del Pedido</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} productos)</Text>
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

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
        >
          <Text style={styles.placeOrderButtonText}>
            Confirmar Pedido • ${total.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  paymentOptionTitleSelected: {
    color: Colors.light.primary,
  },
  paymentOptionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  zelleInfo: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  zelleInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  zelleInfoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  zelleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  zelleInfoSubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  zelleWarning: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  zelleWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  zelleWarningText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  zelleWarningBold: {
    fontWeight: '700',
    color: '#92400E',
  },
  referenceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  referenceCodeContainer: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.primary,
  },
  referenceCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  referenceSubtext: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  creditCardForm: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  placeOrderButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  placeOrderButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});