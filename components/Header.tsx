import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Theme } from '@/constants/theme';
import { Menu, Search, ShoppingBag, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/store/useCartStore';
import { MenuDrawer } from '@/components/MenuDrawer';

export default function Header() {
    const router = useRouter();
    const cartItemsCount = useCartStore((state) => state.cartItems.length);
    const [menuVisible, setMenuVisible] = useState(false);

    return (
        <>
            <View style={styles.container}>
                <View style={styles.leftSection}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setMenuVisible(true)}>
                        <Menu size={24} color={Theme.colors.black} strokeWidth={1.5} />
                    </TouchableOpacity>
                    {Platform.OS === 'web' && (
                        <View style={styles.desktopNav}>
                            <TouchableOpacity onPress={() => router.push('/catalog' as any)}><Text style={styles.navLink}>SHOP</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => { }}><Text style={styles.navLink}>INSPIRATION</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => { }}><Text style={styles.navLink}>PROJECTS</Text></TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.centerSection}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/home' as any)}>
                        <Text style={styles.logo}>VIZZARO</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.rightSection}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/catalog' as any)}>
                        <Search size={24} color={Theme.colors.black} strokeWidth={1.5} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/favorites' as any)}>
                        <User size={24} color={Theme.colors.black} strokeWidth={1.5} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/cart' as any)}>
                        <ShoppingBag size={24} color={Theme.colors.black} strokeWidth={1.5} />
                        {cartItemsCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{cartItemsCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
            <MenuDrawer visible={menuVisible} onClose={() => setMenuVisible(false)} />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: Theme.colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    leftSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    centerSection: {
        flex: 1,
        alignItems: 'center',
    },
    rightSection: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 15,
    },
    logo: {
        fontFamily: Theme.typography.fontFamily.serifBold,
        fontSize: 24,
        color: Theme.colors.black,
        letterSpacing: 2,
    },
    iconButton: {
        padding: 4,
        position: 'relative',
    },
    desktopNav: {
        flexDirection: 'row',
        gap: 20,
    },
    navLink: {
        fontFamily: Theme.typography.fontFamily.sans,
        fontSize: 13,
        color: Theme.colors.black,
        letterSpacing: 1,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: Theme.colors.black,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: Theme.colors.white,
        fontSize: 9,
        fontWeight: 'bold',
    },
});
