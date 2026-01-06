
import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initSentry } from "../sentry.config";

import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="wallpaper/[id]" options={{ headerShown: false }} />

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

import { WhatsAppButton } from '@/components/WhatsAppButton';

// ... items

import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useCollectionsStore } from '@/store/useCollectionsStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useOrdersStore } from '@/store/useOrdersStore';


export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  useEffect(() => {
    initSentry();
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
    // Initialize Stores
    useAuthStore.getState().initialize();
    useCartStore.getState().initialize();
    useWallpapersStore.getState().initialize();
    useFavoritesStore.getState().initialize();
    useCollectionsStore.getState().initialize();
    useHistoryStore.getState().initialize();
    useOrdersStore.getState().initialize();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <StatusBar style="dark" />
          <RootLayoutNav />
          <WhatsAppButton />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
