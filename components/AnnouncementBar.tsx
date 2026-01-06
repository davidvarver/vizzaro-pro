import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AnnouncementBar() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Text style={styles.text}>FREE SHIPPING ON ALL ORDERS OVER $100</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Theme.colors.black,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: Theme.colors.white,
        fontFamily: Theme.typography.fontFamily.sansMedium,
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
});
