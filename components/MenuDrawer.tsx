import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    Platform,
    TouchableWithoutFeedback
} from 'react-native';
import { Theme } from '@/constants/theme';
import { X, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 300);

interface MenuDrawerProps {
    visible: boolean;
    onClose: () => void;
}

export function MenuDrawer({ visible, onClose }: MenuDrawerProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleNav = (path: string) => {
        onClose();
        // Small delay to allow drawer to close
        setTimeout(() => {
            router.push(path as any);
        }, 300);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.drawer,
                        { transform: [{ translateX: slideAnim }], paddingTop: insets.top + 20 }
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={styles.menuTitle}>MENU</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X color={Theme.colors.black} size={24} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.navItems}>
                        <TouchableOpacity style={styles.navItem} onPress={() => handleNav('/(tabs)/home')}>
                            <Text style={styles.navText}>HOME</Text>
                            <ChevronRight size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => handleNav('/catalog')}>
                            <Text style={styles.navText}>SHOP WALLPAPER</Text>
                            <ChevronRight size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => handleNav('/favorites')}>
                            <Text style={styles.navText}>MY FAVORITES</Text>
                            <ChevronRight size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => handleNav('/(tabs)/cart')}>
                            <Text style={styles.navText}>MY CART</Text>
                            <ChevronRight size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.navItem} onPress={() => handleNav('/(tabs)/camera')}>
                            <Text style={styles.navText}>VISUALIZER</Text>
                            <ChevronRight size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerLink}>About Us</Text>
                        <Text style={styles.footerLink}>Contact</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawer: {
        width: DRAWER_WIDTH,
        height: '100%',
        backgroundColor: Theme.colors.white,
        paddingHorizontal: 24,
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    menuTitle: {
        fontFamily: Theme.typography.fontFamily.serifBold,
        fontSize: 24,
        color: Theme.colors.black,
        letterSpacing: 2,
    },
    closeBtn: {
        padding: 4,
    },
    navItems: {
        gap: 0,
    },
    navItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    navText: {
        fontFamily: Theme.typography.fontFamily.sansMedium,
        fontSize: 14,
        color: Theme.colors.black,
        letterSpacing: 1,
    },
    footer: {
        marginTop: 60,
        gap: 16,
    },
    footerLink: {
        fontFamily: Theme.typography.fontFamily.sans,
        fontSize: 14,
        color: Theme.colors.textSecondary,
        textDecorationLine: 'underline',
    },
});
