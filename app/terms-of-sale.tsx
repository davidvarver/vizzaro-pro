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
                <Text style={styles.headerTitle}>Terms & Conditions of Sale</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                <View style={styles.alertBox}>
                    <Text style={styles.alertText}>
                        <Text style={styles.bold}>Essential Policy:</Text> Please inspect all merchandise immediately upon receipt. No claims for damages or defects will be accepted once the wallpaper has been cut or installed.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Return Policy (All Sales Final)</Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>ALL SALES ARE FINAL.</Text> We do not accept returns, exchanges, or refunds for any product, even if unopened or in original condition.
                    </Text>
                    <Text style={styles.paragraph}>
                        Please ensure you verify your measurements and order a sample before purchasing to confirm color and texture.
                    </Text>
                    <Text style={styles.paragraph}>
                        Exceptions are made <Text style={styles.bold}>ONLY</Text> in the case of proven manufacturing defects or shipping damage (see Section 2).
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Inspection & Defects</Text>
                    <Text style={styles.paragraph}>
                        Customers must inspect all rolls for defects, correct pattern, and batch number consistency <Text style={styles.bold}>BEFORE</Text> cutting or hanging.
                    </Text>
                    <Text style={styles.paragraph}>
                        If you receive defective merchandise, please notify Vizzaro immediately (within 48 hours). We will replace defective rolls at no charge. However, <Text style={styles.bold}>no claims for labor costs or consequential damages will be accepted.</Text> Hanging the wallpaper constitutes acceptance of the product's condition.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Color Variations & Batches</Text>
                    <Text style={styles.paragraph}>
                        Wallpaper is produced in dye lots (batches). We cannot guarantee color matching for orders placed at different times.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Strong Recommendation:</Text> Always order enough material to complete your entire project, plus 10-15% extra for waste and pattern matching. We cannot guarantee availability of the same batch for future add-on orders.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Cancellations</Text>
                    <Text style={styles.paragraph}>
                        Orders for stock items may be cancelled only if they have not yet been processed or shipped. Custom orders (Murals/Digital) cannot be cancelled once production has begun.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Samples</Text>
                    <Text style={styles.paragraph}>
                        We strongly encourage ordering samples to verify color and texture. Computer screens do not accurately represent physical colors. Sample costs are non-refundable.
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
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    alertBox: {
        backgroundColor: '#FFF4F4',
        borderColor: '#FFD7D7',
        borderWidth: 1,
        padding: 16,
        borderRadius: 8,
        marginBottom: 32,
    },
    alertText: {
        fontSize: 14,
        color: '#D8000C',
        lineHeight: 20,
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
        fontSize: 15,
        color: Colors.light.textSecondary,
        lineHeight: 24,
        marginBottom: 12,
        textAlign: 'justify',
    },
    list: {
        marginBottom: 16,
        paddingLeft: 8,
    },
    listItem: {
        fontSize: 15,
        color: Colors.light.textSecondary,
        lineHeight: 24,
        marginBottom: 8,
    },
    bold: {
        fontWeight: 'bold',
        color: Colors.light.text,
    },
});
