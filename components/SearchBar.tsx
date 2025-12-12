import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onSubmit: () => void;
    placeholder?: string;
}

export const SearchBar = ({
    value,
    onChangeText,
    onSubmit,
    placeholder = "Buscar..."
}: SearchBarProps) => {
    return (
        <View style={styles.searchContainer}>
            <Search size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={Colors.light.textSecondary}
                onSubmitEditing={onSubmit}
                returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchButton} onPress={onSubmit}>
                <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        width: '100%',
        maxWidth: 600,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.light.text,
        paddingVertical: 12,
    },
    searchButton: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 8,
    },
    searchButtonText: {
        color: Colors.light.background,
        fontSize: 16,
        fontWeight: '600',
    },
});
