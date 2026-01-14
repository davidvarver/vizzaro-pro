import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import Colors from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
    const router = useRouter();
    const { wallpapers } = useWallpapersStore();
    const { category } = useLocalSearchParams<{ category?: string }>();
    const [query, setQuery] = useState(category || '');

    const filteredWallpapers = React.useMemo(() => {
        if (!query) return [];

        const normalizeText = (text: string) => {
            return text
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();
        };

        const searchTerms = normalizeText(query).split(/[\s+]+/).filter(Boolean);

        const seenGroups = new Set();
        return wallpapers.filter(w => {
            const rawText = `${w.name} ${w.category} ${w.style} ${w.group || ''}`;
            const searchableText = normalizeText(rawText);
            const matches = searchTerms.every(term => searchableText.includes(term));

            if (!matches) return false;

            // Deduplicate by Group ID
            const groupId = w.group || w.id;
            if (seenGroups.has(groupId)) {
                return false;
            }
            seenGroups.add(groupId);
            return true;
        });
    }, [query, wallpapers]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/product/${item.id}` as any)}
        >
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.category}>{item.category} • {item.style}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search wallpapers..."
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={filteredWallpapers}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No results found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backBtn: {
        paddingRight: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#333',
    },
    list: {
        padding: 15,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    thumb: {
        width: 60,
        height: 60,
        borderRadius: 6,
        backgroundColor: '#eee',
    },
    info: {
        flex: 1,
        marginLeft: 15,
    },
    name: {
        fontWeight: '600',
        fontSize: 16,
        color: '#333',
    },
    category: {
        color: '#888',
        fontSize: 12,
        marginVertical: 2,
    },
    price: {
        fontWeight: 'bold',
        color: Colors.light.tint,
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
});
