import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
    id: string;
    email: string;
    name: string;
    isAdmin?: boolean;
    createdAt: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    pendingVerification: PendingVerification | null;

    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
    logout: () => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
    verifyCode: (code: string) => Promise<{ success: boolean; error?: string }>;
    resendCode: () => Promise<{ success: boolean; error?: string }>;
    loadAuthData: () => Promise<void>;
}

interface PendingVerification {
    email: string;
    password: string;
    name: string;
    code: string;
    expiresAt: number;
}

const AUTH_TOKEN_KEY = '@auth_token';
const AUTH_USER_KEY = '@auth_user';

function getApiBaseUrl(): string {
    if (process.env.EXPO_PUBLIC_API_URL) {
        const url = process.env.EXPO_PUBLIC_API_URL;
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }
    // In a store we don't have window access checking the same way as context usually runs in React component
    // keeping simple fallback
    return 'https://www.vizzarowallpaper.com';
}

const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/verification-send`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Error ${response.status}`);
    }
};

export const useAuthStore = create<AuthState>()((set, get) => ({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    pendingVerification: null,

    loadAuthData: async () => {
        try {
            const [token, userJson] = await Promise.all([
                AsyncStorage.getItem(AUTH_TOKEN_KEY),
                AsyncStorage.getItem(AUTH_USER_KEY),
            ]);

            if (token && userJson) {
                const user = JSON.parse(userJson);
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    isAdmin: user.isAdmin || false,
                    isLoading: false,
                });
            } else {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isAdmin: false,
                    isLoading: false,
                });
            }
        } catch (error) {
            console.error('Error loading auth data:', error);
            set({ isLoading: false });
        }
    },

    login: async (email, password) => {
        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                return { success: false, error: errorData.error || 'Correo o contraseña incorrectos' };
            }

            const data = await response.json();
            if (data.success && data.user && data.token) {
                await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
                await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

                set({
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true,
                    isAdmin: data.user.isAdmin || false,
                    isLoading: false,
                });
                return { success: true, isAdmin: data.user.isAdmin || false };
            }
            return { success: false, error: 'Respuesta inválida del servidor' };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            return { success: false, error: `Error al iniciar sesión: ${msg}` };
        }
    },

    logout: async () => {
        try {
            await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                isAdmin: false,
            });
        } catch (error) {
            console.error('Error during logout:', error);
        }
    },

    register: async (email, password, name) => {
        try {
            const code = generateVerificationCode();
            const expiresAt = Date.now() + 10 * 60 * 1000;

            set({
                pendingVerification: { email, password, name, code, expiresAt },
            });

            await sendVerificationEmail(email, code);
            return { success: true, needsVerification: true };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            return { success: false, error: `Error al registrar: ${msg}` };
        }
    },

    verifyCode: async (code) => {
        const { pendingVerification } = get();
        if (!pendingVerification) {
            return { success: false, error: 'No hay verificación pendiente' };
        }
        if (Date.now() > pendingVerification.expiresAt) {
            set({ pendingVerification: null });
            return { success: false, error: 'El código ha expirado' };
        }
        if (code !== pendingVerification.code) {
            return { success: false, error: 'Código incorrecto' };
        }

        try {
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: pendingVerification.email,
                    password: pendingVerification.password,
                    name: pendingVerification.name,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                return { success: false, error: errorData.error || 'Error al registrar usuario' };
            }

            const data = await response.json();
            if (data.success && data.user && data.token) {
                await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
                await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

                set({
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true,
                    isAdmin: data.user.isAdmin || false,
                    isLoading: false,
                    pendingVerification: null,
                });
                return { success: true };
            }
            return { success: false, error: data.error || 'Respuesta inválida del servidor' };
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            return { success: false, error: `Error al verificar: ${msg}` };
        }
    },

    resendCode: async () => {
        const { pendingVerification } = get();
        if (!pendingVerification) {
            return { success: false, error: 'No hay verificación pendiente' };
        }
        const code = generateVerificationCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        set({
            pendingVerification: { ...pendingVerification, code, expiresAt },
        }); // update code

        try {
            await sendVerificationEmail(pendingVerification.email, code);
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Error al reenviar código' };
        }
    },
}));
