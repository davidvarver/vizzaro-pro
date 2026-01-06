import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Theme } from '@/constants/theme';
import { Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    initialExpanded?: boolean;
}

export function AccordionItem({ title, children, initialExpanded = false }: AccordionItemProps) {
    const [expanded, setExpanded] = useState(initialExpanded);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleExpand} style={styles.header} activeOpacity={0.7}>
                <Text style={styles.title}>{title}</Text>
                {expanded ? (
                    <Minus size={20} color={Theme.colors.black} />
                ) : (
                    <Plus size={20} color={Theme.colors.black} />
                )}
            </TouchableOpacity>
            {expanded && (
                <View style={styles.content}>
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: Theme.colors.white,
    },
    title: {
        fontFamily: Theme.typography.fontFamily.sansMedium,
        fontSize: 14,
        color: Theme.colors.black,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    content: {
        paddingBottom: 24,
    },
});
