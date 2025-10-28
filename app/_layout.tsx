import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { CartProvider } from "@/contexts/CartContext";
import { OrdersProvider } from "@/contexts/OrdersContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { WallpapersProvider } from "@/contexts/WallpapersContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CollectionsProvider } from "@/contexts/CollectionsContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="wallpaper/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/login" options={{ headerShown: false }} />
      <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="admin/orders" options={{ headerShown: false }} />
      <Stack.Screen name="admin/catalog" options={{ headerShown: false }} />
      <Stack.Screen name="admin/collections" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="project-comparison/[projectId]" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WallpapersProvider>
          <CollectionsProvider>
            <FavoritesProvider>
              <AdminProvider>
                <OrdersProvider>
                  <CartProvider>
                  <GestureHandlerRootView style={styles.container}>
                    <StatusBar style="dark" />
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                  </CartProvider>
                </OrdersProvider>
              </AdminProvider>
            </FavoritesProvider>
          </CollectionsProvider>
        </WallpapersProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
