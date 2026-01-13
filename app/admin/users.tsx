import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, User } from '@/store/useAuthStore';
import Colors from '@/constants/colors';
import AdminGuard from '@/components/AdminGuard';

export default function AdminUsersScreen() {
    const router = useRouter();
    const { getUsers, updateUserRole } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const result = await getUsers();
        if (result.success && result.users) {
            setUsers(result.users);
        } else {
            Alert.alert('Error', result.error || 'Failed to load users');
        }
        setLoading(false);
    };

    const handleToggleAdmin = async (user: User) => {
        const newStatus = !user.isAdmin;
        const action = newStatus ? 'promote' : 'demote';

        Alert.alert(
            `Confirm ${action}`,
            `Are you sure you want to ${action} ${user.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        const result = await updateUserRole(user.id, newStatus);
                        if (result.success) {
                            Alert.alert('Success', `User ${newStatus ? 'promoted' : 'demoted'} successfully`);
                            loadUsers(); // Refresh list
                        } else {
                            Alert.alert('Error', result.error || 'Failed to update role');
                        }
                    }
                }
            ]
        );
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: User }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                {item.isAdmin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>}
            </View>
            <TouchableOpacity
                style={[styles.actionButton, item.isAdmin ? styles.demoteButton : styles.promoteButton]}
                onPress={() => handleToggleAdmin(item)}
            >
                <Text style={[styles.actionText, item.isAdmin ? styles.demoteText : styles.promoteText]}>
                    {item.isAdmin ? 'Demote' : 'Make Admin'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <AdminGuard>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Manage Users</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={filteredUsers}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
                    />
                )}
            </SafeAreaView>
        </AdminGuard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 15,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    list: {
        padding: 15,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
    },
    adminBadge: {
        marginTop: 4,
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    adminBadgeText: {
        color: '#3730a3',
        fontSize: 10,
        fontWeight: 'bold',
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
    },
    promoteButton: {
        borderColor: '#10b981',
        backgroundColor: '#ecfdf5',
    },
    promoteText: {
        color: '#059669',
        fontWeight: '600',
        fontSize: 12,
    },
    demoteButton: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    demoteText: {
        color: '#dc2626',
        fontWeight: '600',
        fontSize: 12,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 16,
        marginTop: 40,
    }
});
