import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'manager';
}

const ADMIN_SESSION_KEY = 'admin_session';
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

const generateAdminToken = () => {
  const token = process.env.EXPO_PUBLIC_ADMIN_TOKEN || '';
  return token;
};

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const saveSession = useCallback(async (admin: AdminUser, token: string) => {
    try {
      if (!admin || !admin.id || !admin.username.trim()) {
        console.error('Invalid admin data');
        return;
      }
      await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving admin session:', error);
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      const storedToken = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
      if (stored && storedToken) {
        const admin = JSON.parse(stored);
        const currentToken = generateAdminToken();

        if (storedToken !== currentToken) {
          console.log('[AdminContext] Token mismatch, updating stored token');
          console.log('[AdminContext] Old token:', storedToken);
          console.log('[AdminContext] New token:', currentToken);
          await AsyncStorage.setItem(ADMIN_TOKEN_KEY, currentToken);
          setAdminToken(currentToken);
        } else {
          setAdminToken(storedToken);
        }

        setCurrentAdmin(admin);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading admin session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const admin: AdminUser = {
          id: '1',
          username: username,
          name: 'Administrador',
          role: 'admin',
        };

        const token = generateAdminToken();

        setCurrentAdmin(admin);
        setAdminToken(token);
        setIsAuthenticated(true);
        await saveSession(admin, token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  }, [saveSession]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
      await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
      setCurrentAdmin(null);
      setAdminToken(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  return useMemo(() => ({
    currentAdmin,
    isLoading,
    isAuthenticated,
    adminToken,
    login,
    logout,
  }), [currentAdmin, isLoading, isAuthenticated, adminToken, login, logout]);
});