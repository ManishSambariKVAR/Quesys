// ============================================
// API Response Types
// ============================================

export interface Counter {
    id: number;
    counter: string;
}

export interface User {
    id: string;
    name: string;
    userId: string;
    adminLevel: string;
    department: string;
    counter: string;
    kioskId?: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
    user: User;
    redirect: string;
}

export interface CountersResponse {
    counters: Counter[];
    error: string;
}

// ============================================
// Component Prop Types
// ============================================

export interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (userId: string, password: string, counter: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
    authLoading: boolean;
}
