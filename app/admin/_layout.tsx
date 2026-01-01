import React from 'react';
import { Stack } from 'expo-router';
import { AdminProvider } from '@/contexts/AdminContext';

export default function AdminLayout() {
    return (
        <AdminProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="dashboard" />
                <Stack.Screen name="catalog" />
                <Stack.Screen name="add-product" />
                <Stack.Screen name="orders/index" />
                <Stack.Screen name="orders/[id]" />
                <Stack.Screen name="collections" />
            </Stack>
        </AdminProvider>
    );
}
