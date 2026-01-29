import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';

export default function MobileMenuScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { logout, user } = useAuthStore();

    const menuItems = [
        { label: 'CATALOG', icon: 'grid-outline', route: '/(tabs)/home' },
        { label: 'SEARCH', icon: 'search-outline', route: '/search' },
        { label: 'VISUALIZER', icon: 'camera-outline', route: '/(tabs)/camera' },
        { label: 'CART', icon: 'cart-outline', route: '/(tabs)/cart' },
        { label: 'PROFILE', icon: 'person-outline', route: '/(tabs)/profile' },
        { label: 'FAVORITES', icon: 'heart-outline', route: '/favorites' },
    ];

    const handleNavigation = (route: string) => {
        router.push(route as any);
    };

    return (
        <View style={styles.container}>
            {/* Overlay Background */}
            <View style={styles.overlay}>
                <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="light" style={styles.blur} />
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={require('@/assets/images/logo-header.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <Ionicons name="close" size={30} color={Colors.light.text} />
                    </TouchableOpacity>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => handleNavigation(item.route)}
                        >
                            <Ionicons name={item.icon as any} size={24} color={Colors.light.text} style={styles.icon} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" style={styles.arrow} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    {user ? (
                        <TouchableOpacity style={styles.signOutButton} onPress={() => { logout(); router.replace('/auth/login'); }}>
                            <Text style={styles.signOutText}>SIGN OUT</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth/login')}>
                            <Text style={styles.signInText}>SIGN IN / REGISTER</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.95)',
    },
    blur: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 20,
    },
    logo: {
        width: 140,
        height: 40,
    },
    closeButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: '#f5f5f5',
    },
    menuContainer: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    icon: {
        marginRight: 15,
        width: 24,
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        letterSpacing: 1,
    },
    arrow: {
        opacity: 0.5,
    },
    footer: {
        marginBottom: 40,
    },
    signOutButton: {
        paddingVertical: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },
    signOutText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666',
        letterSpacing: 1,
    },
    signInButton: {
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: Colors.light.tint,
        borderRadius: 8,
    },
    signInText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 1,
    },
});
