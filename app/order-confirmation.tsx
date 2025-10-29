import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle,
  Mail,
  Copy,
  Home,
  MessageCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

export default function OrderConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const orderId = params.orderId as string;
  const total = params.total as string;
  const paymentMethod = params.paymentMethod as string;
  const zelleReference = params.zelleReference as string;
  const customerName = params.customerName as string;
  const customerEmail = params.customerEmail as string;
  const items = params.items as string;

  const parsedItems = items ? JSON.parse(items) : [];

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== 'web') {
      alert(`${label} copiado al portapapeles`);
    }
  };

  const sendWhatsApp = () => {
    const phone = '17326646800';
    let message = `¡Hola! He realizado un pedido:\n\n`;
    message += `📦 *Pedido #${orderId}*\n`;
    message += `👤 ${customerName}\n`;
    message += `💰 Total: $${total}\n\n`;
    
    if (paymentMethod === 'zelle' && zelleReference) {
      message += `💳 *Pago por Zelle*\n`;
      message += `Código de referencia: ${zelleReference}\n\n`;
    }
    
    message += `*Productos:*\n`;
    parsedItems.forEach((item: any, index: number) => {
      message += `${index + 1}. ${item.wallpaper.name} - ${item.rollsNeeded} rollos\n`;
    });
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const sendEmail = () => {
    const subject = `Consulta sobre Pedido #${orderId}`;
    const body = `Hola,\n\nTengo una consulta sobre mi pedido #${orderId}.\n\nGracias.`;
    const url = `mailto:info@vizzarowallpaper.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <CheckCircle size={80} color={Colors.light.primary} strokeWidth={2} />
        </View>

        <Text style={styles.title}>¡Pedido Confirmado!</Text>
        <Text style={styles.subtitle}>
          Gracias por tu compra, {customerName}
        </Text>

        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderLabel}>Número de Pedido</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(orderId, 'Número de pedido')}
            >
              <Copy size={16} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.orderId}>#{orderId}</Text>

          <View style={styles.divider} />

          <View style={styles.orderDetail}>
            <Text style={styles.detailLabel}>Total Pagado</Text>
            <Text style={styles.detailValue}>${total}</Text>
          </View>

          <View style={styles.orderDetail}>
            <Text style={styles.detailLabel}>Método de Pago</Text>
            <Text style={styles.detailValue}>
              {paymentMethod === 'zelle' ? 'Zelle' : 'Tarjeta de Crédito'}
            </Text>
          </View>

          <View style={styles.orderDetail}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{customerEmail}</Text>
          </View>
        </View>

        {paymentMethod === 'zelle' && zelleReference && (
          <View style={styles.zelleCard}>
            <Text style={styles.zelleTitle}>💳 Instrucciones de Pago Zelle</Text>
            
            <View style={styles.zelleInfo}>
              <Text style={styles.zelleLabel}>Envía el pago a:</Text>
              <View style={styles.zelleValueRow}>
                <Text style={styles.zelleValue}>7326646800</Text>
                <TouchableOpacity
                  style={styles.miniCopyButton}
                  onPress={() => copyToClipboard('7326646800', 'Número Zelle')}
                >
                  <Copy size={14} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.zelleInfo}>
              <Text style={styles.zelleLabel}>Monto:</Text>
              <Text style={styles.zelleValue}>${total}</Text>
            </View>

            <View style={styles.referenceBox}>
              <Text style={styles.referenceLabel}>Tu Código de Referencia:</Text>
              <View style={styles.referenceCodeContainer}>
                <Text style={styles.referenceCode}>{zelleReference}</Text>
                <TouchableOpacity
                  style={styles.copyRefButton}
                  onPress={() => copyToClipboard(zelleReference, 'Código de referencia')}
                >
                  <Copy size={18} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.referenceSubtext}>
                Incluye este código en la nota del pago Zelle
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Importante</Text>
              <Text style={styles.warningText}>
                Debes incluir el código de referencia en la nota de tu pago Zelle para que podamos procesar tu pedido automáticamente.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.productsCard}>
          <Text style={styles.productsTitle}>Productos</Text>
          {parsedItems.map((item: any, index: number) => (
            <View key={index} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.wallpaper.name}</Text>
                <Text style={styles.productStyle}>{item.wallpaper.style}</Text>
              </View>
              <View style={styles.productQty}>
                <Text style={styles.qtyText}>{item.rollsNeeded} rollos</Text>
                <Text style={styles.priceText}>
                  ${(item.wallpaper.price * item.rollsNeeded).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.emailNotice}>
          <Mail size={20} color={Colors.light.primary} />
          <Text style={styles.emailNoticeText}>
            Se ha generado tu pedido correctamente. Por favor, guarda tu número de pedido #{orderId} y contáctanos por WhatsApp para confirmar tu compra.
          </Text>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.contactSubtitle}>Contáctanos por:</Text>

          <TouchableOpacity style={styles.contactButton} onPress={sendWhatsApp}>
            <MessageCircle size={24} color="#25D366" />
            <View style={styles.contactButtonText}>
              <Text style={styles.contactButtonTitle}>WhatsApp</Text>
              <Text style={styles.contactButtonSubtitle}>+1 (732) 664-6800</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactButton} onPress={sendEmail}>
            <Mail size={24} color={Colors.light.primary} />
            <View style={styles.contactButtonText}>
              <Text style={styles.contactButtonTitle}>Email</Text>
              <Text style={styles.contactButtonSubtitle}>info@vizzarowallpaper.com</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Home size={20} color={Colors.light.background} />
          <Text style={styles.homeButtonText}>Volver al Inicio</Text>
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
  content: {
    flex: 1,
  },
  successIcon: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  copyButton: {
    padding: 4,
  },
  orderId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 16,
  },
  orderDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  zelleCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  zelleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 16,
  },
  zelleInfo: {
    marginBottom: 12,
  },
  zelleLabel: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 4,
  },
  zelleValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zelleValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  miniCopyButton: {
    padding: 4,
  },
  referenceBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#F59E0B',
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
    textAlign: 'center',
  },
  referenceCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  referenceCode: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.primary,
    letterSpacing: 2,
  },
  copyRefButton: {
    padding: 8,
  },
  referenceSubtext: {
    fontSize: 12,
    color: '#78350F',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  productsCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  productStyle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  productQty: {
    alignItems: 'flex-end',
  },
  qtyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emailNotice: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  emailNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
  contactSection: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  contactButtonText: {
    flex: 1,
  },
  contactButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  contactButtonSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  homeButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  homeButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
