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
                <Text style={styles.headerTitle}>Términos y Condiciones</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Política de Devoluciones y Reembolsos</Text>
                    <Text style={styles.paragraph}>
                        Debido a la naturaleza personalizada de nuestros productos (papel tapiz impreso bajo demanda o cortado a medida), <Text style={styles.bold}>NO ACEPTAMOS DEVOLUCIONES NI CAMBIOS</Text> una vez que el pedido ha sido procesado o entregado, excepto en casos de defectos de fabricación comprobados.
                    </Text>
                    <Text style={styles.paragraph}>
                        Por favor, asegúrese de ordenar una muestra antes de realizar su compra final para verificar el color y la textura, ya que las pantallas de los dispositivos pueden variar la percepción del color real.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Variaciones de Color (Lotes)</Text>
                    <Text style={styles.paragraph}>
                        El papel tapiz se produce en lotes. Puede haber ligeras variaciones de color entre diferentes lotes de impresión.
                    </Text>
                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Importante:</Text> Recomendamos encarecidamente comprar todo el papel necesario para un proyecto en un solo pedido para garantizar que provenga del mismo lote. No garantizamos coincidencia de color en pedidos separados realizados en diferentes momentos.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Responsabilidad de las Medidas</Text>
                    <Text style={styles.paragraph}>
                        El cliente es el único responsable de proporcionar las medidas correctas de sus paredes. Vizzaro no se hace responsable por la falta de material debido a mediciones incorrectas o errores en el cálculo de la cantidad necesaria por parte del cliente.
                    </Text>
                    <Text style={styles.paragraph}>
                        Sugerimos siempre agregar un 10-15% extra al total calculado para cubrir desperdicios del patrón (rapport) y posibles errores de instalación.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Defectos y Daños</Text>
                    <Text style={styles.paragraph}>
                        Inspeccione su pedido inmediatamente al recibirlo. Si detecta algún defecto visible o daño en el envío, debe notificarnos dentro de las 48 horas posteriores a la recepción, enviando fotografías del empaque y del producto dañado.
                    </Text>
                    <Text style={styles.paragraph}>
                        No se aceptarán reclamos sobre defectos después de que el papel haya sido cortado o instalado. Es responsabilidad del instalador verificar la calidad del material antes de la colocación. La instalación del producto constituye la aceptación de su calidad.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Instalación</Text>
                    <Text style={styles.paragraph}>
                        Vizzaro es solo proveedor del material. No asumimos responsabilidad por errores de instalación, preparación inadecuada de la superficie, o costos de mano de obra.
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
