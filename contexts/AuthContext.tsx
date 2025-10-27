import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  try {
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/verification-send`
      : 'https://www.vizzarowallpaper.com/api/verification-send';

    console.log('📤 Enviando request a:', apiUrl);
    console.log('📧 Para:', email);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Response error:', response.status, errorData);
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('✅ Response exitosa:', responseData);
    console.log('✅ Email de verificación enviado a:', email);
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    console.log('📧 Código de verificación (fallback):', code);
    throw error;
  }
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const [tokenJson, userJson] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY),
      ]);

      if (tokenJson && userJson) {
        const token = tokenJson;
        const user = JSON.parse(userJson);
        setAuthState({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    try {
      console.log('🔄 Iniciando registro para:', email);
      
      const code = generateVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      console.log('🔑 Código generado:', code);

      setPendingVerification({
        email,
        password,
        name,
        code,
        expiresAt,
      });

      console.log('📧 Intentando enviar email...');
      
      try {
        await sendVerificationEmail(email, code);
        console.log('✅ Email enviado exitosamente');
        return { success: true, needsVerification: true };
      } catch (emailError) {
        console.error('❌ Error al enviar email:', emailError);
        const errorMsg = emailError instanceof Error ? emailError.message : 'Error desconocido';
        return { 
          success: false, 
          error: `Error al enviar el correo: ${errorMsg}. Revisa la consola para más detalles.` 
        };
      }
    } catch (error) {
      console.error('❌ Error durante el registro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return { 
        success: false, 
        error: `Error al registrar usuario: ${errorMessage}` 
      };
    }
  };

  const verifyCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingVerification) {
        return { success: false, error: 'No hay verificación pendiente' };
      }

      if (Date.now() > pendingVerification.expiresAt) {
        setPendingVerification(null);
        return { success: false, error: 'El código ha expirado' };
      }

      if (code !== pendingVerification.code) {
        return { success: false, error: 'Código incorrecto' };
      }

      if (API_BASE_URL) {
        try {
          console.log('[AuthContext] Registering user via API...');
          const response = await fetch(`${API_BASE_URL}/api/users/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: pendingVerification.email,
              password: pendingVerification.password,
              name: pendingVerification.name,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[AuthContext] User registered via API');
            
            if (data.success && data.user && data.token) {
              await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
              await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
              
              setAuthState({
                user: data.user,
                token: data.token,
                isLoading: false,
                isAuthenticated: true,
              });
              setPendingVerification(null);
              return { success: true };
            }
          } else {
            const errorData = await response.json();
            console.warn('[AuthContext] API register failed:', errorData);
            return { success: false, error: errorData.error || 'Error al registrar usuario' };
          }
        } catch (apiError) {
          console.warn('[AuthContext] API register error:', apiError);
          return { success: false, error: 'Error al conectar con el servidor' };
        }
      }

      return { success: false, error: 'Servicio no disponible. Intenta más tarde.' };
    } catch (error) {
      console.error('Error verifying code:', error);
      return { success: false, error: 'Error al verificar código' };
    }
  };

  const resendCode = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!pendingVerification) {
        return { success: false, error: 'No hay verificación pendiente' };
      }

      const code = generateVerificationCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      setPendingVerification({
        ...pendingVerification,
        code,
        expiresAt,
      });

      await sendVerificationEmail(pendingVerification.email, code);

      return { success: true };
    } catch (error) {
      console.error('Error resending code:', error);
      return { success: false, error: 'Error al reenviar código' };
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[AuthContext] Logging in...', email);
      
      if (API_BASE_URL) {
        try {
          console.log('[AuthContext] Attempting login via API...');
          const response = await fetch(`${API_BASE_URL}/api/users/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[AuthContext] User logged in via API');
            
            if (data.success && data.user && data.token) {
              await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
              await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
              
              setAuthState({
                user: data.user,
                token: data.token,
                isLoading: false,
                isAuthenticated: true,
              });
              return { success: true };
            }
          } else {
            const errorData = await response.json();
            console.warn('[AuthContext] API login failed:', errorData);
            return { success: false, error: errorData.error || 'Correo o contraseña incorrectos' };
          }
        } catch (apiError) {
          console.warn('[AuthContext] API login error:', apiError);
          return { success: false, error: 'Error al conectar con el servidor' };
        }
      }
      
      console.log('[AuthContext] API not available - login requires backend');
      return { success: false, error: 'Servicio no disponible. Intenta más tarde.' };
    } catch (error) {
      console.error('Error during login:', error);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return {
    ...authState,
    register,
    verifyCode,
    resendCode,
    login,
    logout,
    hasPendingVerification: !!pendingVerification,
    pendingEmail: pendingVerification?.email,
  };
});
