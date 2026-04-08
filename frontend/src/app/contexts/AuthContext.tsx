'use client';

//AuthProvider
// This file defines the AuthContext and AuthProvider components for managing user authentication in the application.

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

//types for user
interface User {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'INVESTOR';
}

//types for auth context
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  
}
//create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component that wraps the application and provides authentication state and functions to its children.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On component mount, check localStorage for existing token and user data to maintain login state across page refreshes.
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    const res = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    
    // Redirect based on user role
    if (data.user.role === 'ADMIN') {
      router.push('/admin'); // Admin goes to admin dashboard
    } else {
      router.push('/dashboard'); // Investor goes to investor dashboard
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  // Check if user is logged in
  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

//useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};