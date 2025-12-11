import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onClear?: () => void;
    onSubmit?: () => void;
    containerStyle?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = "Buscar...",
    onClear,
    onSubmit,
    containerStyle
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            <Search size={20} color={Colors.light.textSecondary} style={styles.icon} />
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={Colors.light.textSecondary}
                returnKeyType="search"
                onSubmitEditing={onSubmit}
            />
            {value.trim().length > 0 && onClear && (
                <TouchableOpacity onPress={onClear} style={styles.clearButton}>
                    <X size={18} color={Colors.light.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.card, // Or background depending on context? kept generic
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.light.border,
        height: 48, // Fixed height for consistency
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.light.text,
        paddingVertical: 8, // Reduced padding vertical since we have fixed height logic usually
        height: '100%',
        ...Platform.select({
            web: { outlineStyle: 'none' } as any, // prevent web outline
        })
    },
    clearButton: {
        padding: 4,
    },
});
