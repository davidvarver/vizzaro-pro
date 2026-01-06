
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { Theme } from '@/constants/theme';
import { useWallpapersStore } from '@/store/useWallpapersStore';
import { UserRoom } from '@/store/useWallpapersStore';

interface RoomGalleryProps {
    onSelectRoom: (image: string) => void;
    onAddRoom: () => void;
    vertical?: boolean;
}

export default function RoomGallery({ onSelectRoom, onAddRoom, vertical = false }: RoomGalleryProps) {
    const userRooms = useWallpapersStore((s) => s.userRooms);
    const deleteUserRoom = useWallpapersStore((s) => s.deleteUserRoom);

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Room',
            'Are you sure you want to delete this room?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteUserRoom(id)
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: UserRoom }) => {
        // Fix for potential missing prefix or double prefix
        const imageUri = item.image.startsWith('data:image')
            ? item.image
            : `data:image/jpeg;base64,${item.image}`;

        return (
            <View style={[styles.roomItem, vertical && styles.roomItemVertical]}>
                <TouchableOpacity
                    style={styles.roomImageContainer}
                    onPress={() => onSelectRoom(item.image)}
                >
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.roomImage}
                    />
                    {/* Minimalist Overlay */}
                    <View style={styles.overlay}>
                        <View style={styles.selectionRing} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Trash2 size={14} color="#FFF" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, vertical && styles.containerVertical]}>
            <View style={[styles.header, vertical && styles.headerVertical]}>
                <Text style={styles.title}>MY ROOMS</Text>
                {!vertical && <Text style={styles.count}>{userRooms.length} saved</Text>}
            </View>

            <FlatList
                horizontal={!vertical}
                data={userRooms}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.listContent, vertical && styles.listContentVertical]}
                ListHeaderComponent={
                    <TouchableOpacity style={[styles.addButton, vertical && styles.addButtonVertical]} onPress={onAddRoom}>
                        <View style={styles.addIconContainer}>
                            <Plus size={20} color={Theme.colors.black} />
                        </View>
                        <Text style={styles.addText}>NEW</Text>
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
    containerVertical: {
        marginBottom: 0,
        flex: 1,
        width: 100, // Fixed width sidebar
        backgroundColor: 'rgba(255,255,255,0.9)', // Light frosted sidebar
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.1)',
        paddingVertical: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    headerVertical: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 0,
    },
    title: {
        fontSize: 14,
        fontFamily: Theme.typography.fontFamily.serifBold,
        color: Theme.colors.black,
        letterSpacing: 1,
    },
    count: {
        fontSize: 12,
        fontFamily: Theme.typography.fontFamily.sans,
        color: Theme.colors.textSecondary,
    },
    listContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    listContentVertical: {
        paddingHorizontal: 10,
        gap: 16,
        alignItems: 'center',
        paddingBottom: 40,
    },
    roomItem: {
        width: 140,
        height: 180,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: Theme.colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    roomItemVertical: {
        width: 80,
        height: 110,
        borderRadius: 2,
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
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionRing: {
        // Optional active state styling
    },
    deleteButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        width: 100,
        height: 180,
        borderRadius: 4,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 0,
    },
    addButtonVertical: {
        width: 80,
        height: 110,
        borderRadius: 2,
        marginBottom: 10,
    },
    addIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    addText: {
        fontSize: 10,
        fontFamily: Theme.typography.fontFamily.sansBold,
        color: Theme.colors.black,
        letterSpacing: 1,
    },
});
