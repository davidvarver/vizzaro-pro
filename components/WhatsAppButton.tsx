import React from 'react';
import { StyleSheet, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

const PHONE_NUMBER = '+17326646800';

interface WhatsAppButtonProps {
  message?: string;
  style?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}

export const WhatsAppButton = ({
  message = 'Hello, I am interested in Vizzaro wallpapers.',
  style = 'primary',
  size = 'medium'
}: WhatsAppButtonProps) => {
  const handlePress = async () => {
    const url = `https://wa.me/${PHONE_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening WhatsApp:', err);
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small': return 40;
      case 'large': return 70;
      default: return 60;
    }
  };

  const buttonSize = getButtonSize();
  const iconSize = size === 'small' ? 20 : size === 'large' ? 36 : 32;

  return (
    <View style={[styles.container, style === 'secondary' ? styles.secondaryContainer : null]}>
      <TouchableOpacity
        style={[styles.button, { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 }]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel="Contactar por WhatsApp"
        accessibilityRole="button"
      >
        <MessageCircle color="white" size={iconSize} fill="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 9999, // Ensure it's above everything
  },
  button: {
    backgroundColor: '#25D366', // WhatsApp Official Green
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  secondaryContainer: {
    position: 'relative',
    bottom: 0,
    right: 0,
    marginTop: 10,
  },
});