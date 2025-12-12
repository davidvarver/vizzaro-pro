import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface FilterGroupProps {
    label?: string;
    options: string[];
    selected: string;
    onSelect: (option: string) => void;
    formatLabel?: (option: string) => string;
}

export const FilterGroup = ({
    label,
    options,
    selected,
    onSelect,
    formatLabel = (opt) => opt
}: FilterGroupProps) => {
    return (
        <View style={styles.filterRow}>
            {label && <Text style={styles.filterLabel}>{label}</Text>}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChips}
            >
                {options.map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.filterChip,
                            selected === option && styles.filterChipActive,
                        ]}
                        onPress={() => onSelect(option)}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                selected === option && styles.filterChipTextActive,
                            ]}
                        >
                            {formatLabel(option)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    filterRow: {
        marginBottom: 16,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        marginLeft: 16,
        marginBottom: 8,
    },
    filterChips: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.light.border,
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    filterChipText: {
        fontSize: 14,
        color: Colors.light.text,
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: Colors.light.background,
    },
});
