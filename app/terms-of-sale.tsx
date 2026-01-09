import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

export default function TermsOfSaleScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms of Sale</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Return and Refund Policy</Text>
                    <Text style={styles.paragraph}>
                        Due to the personalized nature of our products (wallpaper printed on demand or cut to size), <Text style={styles.bold}>WE DO NOT ACCEPT RETURNS OR EXCHANGES</Text> once the order has been processed or delivered, except in cases of proven manufacturing defects.
                    </Text>
                    <Text style={styles.paragraph}>
                        Please ensure you order a sample before making your final purchase to verify color and texture, as device screens may alter the perception of the actual color.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Color Variations (Batches)</Text>
                    <Text style={styles.paragraph}>
                        Wallpaper is produced in batches. There may be slight color variations between different printing batches.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Important:</Text> We strongly recommend buying all the necessary wallpaper for a project in a single order to ensure it comes from the same batch. We do not guarantee color matching for separate orders placed at different times.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Measurement Responsibility</Text>
                    <Text style={styles.paragraph}>
                        The customer is solely responsible for providing the correct wall measurements. Vizzaro is not responsible for material shortages due to incorrect measurements or errors in calculating the required quantity by the customer.
                    </Text>
                    <Text style={styles.paragraph}>
                        We suggest always adding an extra 10-15% to the total calculated to cover pattern wastage (repeat) and potential installation errors.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Defects and Damages</Text>
                    <Text style={styles.paragraph}>
                        Inspect your order immediately upon receipt. If you detect any visible defect or shipping damage, you must notify us within 48 hours of receipt, sending photos of the packaging and the damaged product.
                    </Text>
                    <Text style={styles.paragraph}>
                        Claims for defects will not be accepted after the wallpaper has been cut or installed. It is the installer's responsibility to verify the material quality before installation. Installing the product constitutes acceptance of its quality.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Installation</Text>
                    <Text style={styles.paragraph}>
                        Vizzaro is only the material supplier. We assume no responsibility for installation errors, improper surface preparation, or labor costs.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        lineHeight: 24,
        marginBottom: 12,
        textAlign: 'justify',
    },
    bold: {
        fontWeight: 'bold',
        color: Colors.light.text,
    },
});
