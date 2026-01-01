import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallpaper } from '@/constants/wallpapers';

interface HistoryContextType {
    recentItems: Wallpaper[];
    addToHistory: (item: Wallpaper) => Promise<void>;
    clearHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType>({
    recentItems: [],
    addToHistory: async () => { },
    clearHistory: async () => { },
});

export const useHistory = () => useContext(HistoryContext);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [recentItems, setRecentItems] = useState<Wallpaper[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const stored = await AsyncStorage.getItem('recent_wallpapers');
            if (stored) {
                setRecentItems(JSON.parse(stored));
            }
        } catch (error) {
            console.log('Error loading history:', error);
        }
    };

    const addToHistory = async (item: Wallpaper) => {
        try {
            // Avoid duplicates and limit to 10
            const filtered = recentItems.filter(i => i.id !== item.id);
            const newHistory = [item, ...filtered].slice(0, 10);

            setRecentItems(newHistory);
            await AsyncStorage.setItem('recent_wallpapers', JSON.stringify(newHistory));
        } catch (error) {
            console.log('Error saving history:', error);
        }
    };

    const clearHistory = async () => {
        setRecentItems([]);
        await AsyncStorage.removeItem('recent_wallpapers');
    };

    return (
        <HistoryContext.Provider value={{ recentItems, addToHistory, clearHistory }}>
            {children}
        </HistoryContext.Provider>
    );
};
