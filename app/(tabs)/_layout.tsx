import { Tabs, useRouter } from "expo-router";
import { Grid3X3, Camera, User, ShoppingCart, Menu } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, Platform, useWindowDimensions, TouchableOpacity, Image } from "react-native";
import { useCartStore } from "@/store/useCartStore";

import Colors from "@/constants/colors";

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 768;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        // Mobile: Show Header with Burger. Desktop: Hide Header (Tabs handle nav)
        headerShown: isMobile,
        headerTitle: () => (
          <Image
            source={require('@/assets/images/logo-header.png')}
            style={{ width: 120, height: 35 }}
            resizeMode="contain"
          />
        ),
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.push('/mobile-menu' as any)} style={{ marginLeft: 20 }}>
            <Menu color="#000" size={24} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/cart')} style={{ marginRight: 20 }}>
            <ShoppingCart color="#000" size={24} />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
          height: Platform.OS === 'ios' ? 100 : 80,
        },
        headerTitleAlign: 'center',
        tabBarStyle: {
          display: isMobile ? 'none' : 'flex', // HIDE TABS ON MOBILE
          backgroundColor: Colors.light.background,
          borderTopColor: Colors.light.border,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          position: 'relative',
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          zIndex: 100,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Catalog",
          tabBarIcon: ({ color, size }) => <Grid3X3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          // On mobile, cart is in header, so we can keep tab or not. 
          // But since tabbar is hidden, it doesn't matter.
          title: "Cart",
          tabBarIcon: ({ color, size }) => {
            const cartItems = useCartStore((s) => s.cartItems);
            const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

            return (
              <View>
                <ShoppingCart color={color} size={size} />
                {itemCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {itemCount > 99 ? '99+' : itemCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="product"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="wallpaper-result"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
