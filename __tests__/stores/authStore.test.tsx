// __tests__/stores/authStore.test.tsx
import React, { useEffect } from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Button } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';

// Mock fetch for login
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        headers: {
            get: (header: string) => {
                if (header.toLowerCase() === 'content-type') return 'application/json';
                return null;
            },
        },
        json: () => Promise.resolve({
            success: true,
            token: 'fake-token',
            user: { id: '1', email: 'test@example.com', name: 'Test User' }
        }),
    })
) as jest.Mock;

const TestComponent = () => {
    const { user, isAuthenticated, login, logout, isLoading, initialize } = useAuthStore();

    useEffect(() => {
        initialize();
    }, []);

    if (isLoading) return <Text testID="loading">Loading...</Text>;

    return (
        <>
            <Text testID="auth-status">{isAuthenticated ? 'Authenticated' : 'Guest'}</Text>
            <Text testID="user-email">{user?.email || 'No User'}</Text>
            <Button
                testID="login"
                title="Login"
                onPress={() => login('test@example.com', 'password')}
            />
            <Button testID="logout" title="Logout" onPress={logout} />
        </>
    );
};

test('Auth store handles login and logout', async () => {
    const { getByTestId, queryByTestId } = render(<TestComponent />);

    // Wait for initial load (initialize checks storage)
    await waitFor(() => expect(queryByTestId('loading')).toBeNull());

    // Initial state
    expect(getByTestId('auth-status').props.children).toBe('Guest');
    expect(getByTestId('user-email').props.children).toBe('No User');

    // Trigger Login
    await act(async () => {
        fireEvent.press(getByTestId('login'));
    });

    // Verify logged in state
    await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('Authenticated');
    });
    expect(getByTestId('user-email').props.children).toBe('test@example.com');

    // Trigger Logout
    await act(async () => {
        fireEvent.press(getByTestId('logout'));
    });

    // Verify logged out
    await waitFor(() => {
        expect(getByTestId('auth-status').props.children).toBe('Guest');
    });
    expect(getByTestId('user-email').props.children).toBe('No User');
});

