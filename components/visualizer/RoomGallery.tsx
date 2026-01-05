
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Plus, Trash2, Home } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { UserRoom } from '@/store/useWallpapersStore';

interface RoomGalleryProps {
    onSelectRoom: (image: string) => void;
    onAddRoom: () => void;
}

export default function RoomGallery({ onSelectRoom, onAddRoom }: RoomGalleryProps) {
    const userRooms = useWallpapersStore((s) => s.userRooms);
    const deleteUserRoom = useWallpapersStore((s) => s.deleteUserRoom);

    const handleDelete = (id: string) => {
        Alert.alert(
            'Eliminar habitación',
            '¿Estás seguro de que quieres eliminar esta habitación?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteUserRoom(id)
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: UserRoom }) => (
        <View style={styles.roomItem}>
            <TouchableOpacity
                style={styles.roomImageContainer}
                onPress={() => onSelectRoom(item.image)}
            >
                <Image
                    source={{ uri: `data:image/jpeg;base64,${item.image}` }}
                    style={styles.roomImage}
                />
                <View style={styles.overlay} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Trash2 size={16} color="#FFF" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mis Habitaciones</Text>
                <Text style={styles.count}>{userRooms.length} guardadas</Text>
            </View>

            <FlatList
                horizontal
                data={userRooms}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <TouchableOpacity style={styles.addButton} onPress={onAddRoom}>
                        <View style={styles.addIconContainer}>
                            <Plus size={24} color={Colors.light.primary} />
                        </View>
                        <Text style={styles.addText}>Nueva</Text>
                    </TouchableOpacity>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontFamily: 'Inter-SemiBold',
        color: Colors.light.text,
    },
    count: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: Colors.light.textSecondary,
    },
    listContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    roomItem: {
        width: 140,
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#f0f0f0',
    },
    roomImageContainer: {
        width: '100%',
        height: '100%',
    },
    roomImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        width: 100,
        height: 180,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 0,
    },
    addIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    addText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: Colors.light.text,
    },
});
