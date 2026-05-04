import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api';
import type { User, LoginResponse, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Hydrate from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setAuthLoading(false);
    }, []);

    const login = async (userId: string, password: string, counter: string) => {
        const response = await api.post<LoginResponse>('/login', {
            userId,
            password,
            counter,
        });

        const { token: newToken, user: newUser } = response.data;

        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const isAuthenticated = !!token && !!user;
    const isAdmin = user?.adminLevel === 'Admin';

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isAdmin, authLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
