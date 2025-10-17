import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  style?: 'primary' | 'secondary' | 'floating';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const COMPANY_PHONE = '17326646800';

export default function WhatsAppButton({
  phoneNumber = COMPANY_PHONE,
  message = 'Hola, me interesa información sobre sus papeles tapiz',
  style = 'primary',
  size = 'medium',
  showText = true,
}: WhatsAppButtonProps) {
  const openWhatsApp = async () => {
    try {
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
      const webUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback para web o si WhatsApp no está instalado
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      console.error('WhatsApp not available');
    }
  };

  const getButtonStyle = () => {
    return [
      styles.button,
      style === 'primary' && styles.primaryButton,
      style === 'secondary' && styles.secondaryButton,
      style === 'floating' && styles.floatingButton,
      size === 'small' && styles.smallButton,
      size === 'medium' && styles.mediumButton,
      size === 'large' && styles.largeButton,
    ].filter(Boolean);
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const getTextStyle = () => {
    return [
      styles.buttonText,
      style === 'primary' && styles.primaryText,
      style === 'secondary' && styles.secondaryText,
      style === 'floating' && styles.floatingText,
      size === 'small' && styles.smallText,
      size === 'medium' && styles.mediumText,
      size === 'large' && styles.largeText,
    ].filter(Boolean);
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={openWhatsApp}
      activeOpacity={0.8}
    >
      <MessageCircle 
        size={getIconSize()} 
        color={style === 'secondary' ? '#25D366' : '#FFFFFF'} 
      />
      {showText && (
        <Text style={getTextStyle()}>
          WhatsApp
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButton: {
    backgroundColor: '#25D366',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#25D366',
  },
  floatingButton: {
    backgroundColor: '#25D366',
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  mediumButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  largeButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#25D366',
  },
  floatingText: {
    color: '#FFFFFF',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
});