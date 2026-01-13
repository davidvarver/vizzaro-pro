import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces
export interface User {
    id: string;
    email: string;
    name: string;
    isAdmin?: boolean;
    createdAt: string;
}

interface PendingVerification {
    email: string;
    password: string;
    name: string;
    code: string;
    expiresAt: number;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;

    // Verification State
    pendingVerification: PendingVerification | null;

    // Actions
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
    register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
    verifyCode: (code: string) => Promise<{ success: boolean; error?: string }>;
    resendCode: () => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;

    // Admin Actions
    getUsers: () => Promise<{ success: boolean; users?: User[]; error?: string }>;
    updateUserRole: (userId: string, isAdmin: boolean) => Promise<{ success: boolean; error?: string }>;

    // Initialization
    initialize: () => Promise<void>;
}

const AUTH_TOKEN_KEY = '@auth_token';
const AUTH_USER_KEY = '@auth_user';

function getApiBaseUrl(): string {
    if (process.env.EXPO_PUBLIC_API_URL) {
        const url = process.env.EXPO_PUBLIC_API_URL;
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }

    if (typeof window !== 'undefined' && window.location) {
        return window.location.origin;
    }

    return 'https://www.vizzarowallpaper.com';
}

const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/verification-send`;

    console.log('📤 Enviando request a:', apiUrl);

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

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    pendingVerification: null,

    initialize: async () => {
        try {
            const [tokenJson, userJson] = await Promise.all([
                AsyncStorage.getItem(AUTH_TOKEN_KEY),
                AsyncStorage.getItem(AUTH_USER_KEY),
            ]);

            if (tokenJson && userJson) {
                const token = tokenJson;
                const user = JSON.parse(userJson);
                set({
                    user,
                    token,
                    isLoading: false,
                    isAuthenticated: true,
                    isAdmin: user.isAdmin || false,
                });
            } else {
                set({ isLoading: false, isAuthenticated: false });
            }
        } catch (error) {
            console.error('Error loading auth data:', error);
            set({ isLoading: false, isAuthenticated: false });
        }
    },

    register: async (email, password, name) => {
        try {
            console.log('🔄 Iniciando registro:', email);
            const code = generateVerificationCode();
            const expiresAt = Date.now() + 10 * 60 * 1000;

            const pending: PendingVerification = { email, password, name, code, expiresAt };
            set({ pendingVerification: pending });

            await sendVerificationEmail(email, code);
            console.log('✅ Email enviado');
            return { success: true, needsVerification: true };

        } catch (error) {
            console.error('❌ Error registro:', error);
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            return { success: false, error: `Error al registrar: ${msg}` };
        }
    },

    verifyCode: async (code) => {
        const { pendingVerification } = get();
        if (!pendingVerification) return { success: false, error: 'No hay verificación pendiente' };

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
                    name: pendingVerification.name,
                    password: pendingVerification.password
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user && data.token) {
                    await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
                    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                        isAdmin: data.user.isAdmin || false,
                        pendingVerification: null,
                        isLoading: false
                    });
                    return { success: true };
                }
            }

            return { success: false, error: 'Error al registrar usuario en el servidor' };

        } catch (err) {
            console.error(err);
            return { success: false, error: 'Error de conexión' };
        }
    },

    resendCode: async () => {
        const { pendingVerification } = get();
        if (!pendingVerification) return { success: false, error: 'No hay verificación pendiente' };

        try {
            const code = generateVerificationCode();
            const expiresAt = Date.now() + 10 * 60 * 1000;

            // Update state with new code
            const updated = { ...pendingVerification, code, expiresAt };
            set({ pendingVerification: updated });

            await sendVerificationEmail(updated.email, code);
            return { success: true };
        } catch (e) {
            return { success: false, error: 'Error al reenviar' };
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

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user && data.token) {
                    await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
                    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                        isAdmin: data.user.isAdmin || false,
                        isLoading: false
                    });
                    return { success: true, isAdmin: data.user.isAdmin };
                }
            }

            const errData = await response.json().catch(() => ({}));
            return { success: false, error: errData.error || 'Credenciales inválidas' };

        } catch (error) {
            console.error(error);
            return { success: false, error: 'Error de conexión' };
        }
    },

    getUsers: async () => {
        try {
            const baseUrl = getApiBaseUrl();
            const { token } = get();
            const response = await fetch(`${baseUrl}/api/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, users: data.users || [] };
            }
            return { success: false, error: 'Failed to fetch users' };
        } catch (error) {
            console.error(error);
            return { success: false, error: 'Network error' };
        }
    },

    updateUserRole: async (userId: string, isAdmin: boolean) => {
        try {
            const baseUrl = getApiBaseUrl();
            const { token } = get();

            // Mock implementation if endpoint doesn't exist yet, 
            // but we try to hit a standard route
            const response = await fetch(`${baseUrl}/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isAdmin })
            });

            if (response.ok) {
                return { success: true };
            }
            return { success: false, error: 'Failed to update role' };
        } catch (error) {
            console.error(error);
            return { success: false, error: 'Network error' };
        }
    },

    logout: async () => {
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            isAdmin: false
        });
    }
}));
