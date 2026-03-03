import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { hasPermission, hasRole } from '../utils/permissions';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Load user on mount
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await authApi.getCurrentUser();
                setUser(response.data.user);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Failed to load user:', error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            const response = await authApi.login(email, password);
            const { user, accessToken, refreshToken } = response.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            setUser(user);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed',
            };
        }
    }, []);

    const register = useCallback(async (email, username, password, role, subjectIds) => {
        try {
            const response = await authApi.register(email, username, password, role, subjectIds);
            const { user, accessToken, refreshToken } = response.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            setUser(user);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            console.error('Register error:', error);
            console.error('Register error response status:', error.response?.status);
            console.error('Register error response data:', error.response?.data);
            console.error('Register error message:', error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Registration failed',
                errors: error.response?.data?.errors || []
            };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    const checkPermission = useCallback((permission) => {
        return hasPermission(user, permission);
    }, [user]);

    const checkRole = useCallback((role) => {
        return hasRole(user, role);
    }, [user]);

    const updateProfile = useCallback(async (data) => {
        try {
            const response = await authApi.updateProfile(data);
            setUser(response.data.user);
            return { success: true, message: response.message };
        } catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to update profile',
            };
        }
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        hasPermission: checkPermission,
        hasRole: checkRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
