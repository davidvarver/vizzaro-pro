import React from 'react';
import { StyleSheet, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

const PHONE_NUMBER = '+17326646800';

export const WhatsAppButton = () => {
  const handlePress = async () => {
    const message = 'Hola, estoy interesado en los wallpapers de Vizzaro.';
    const url = `https://wa.me/${PHONE_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening WhatsApp:', err);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel="Contactar por WhatsApp"
        accessibilityRole="button"
      >
        <MessageCircle color="white" size={32} fill="white" />
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
});