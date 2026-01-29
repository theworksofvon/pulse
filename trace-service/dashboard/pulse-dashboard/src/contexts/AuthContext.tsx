import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_KEY_STORAGE_KEY = 'pulse_api_key';

interface AuthContextType {
  apiKey: string | null;
  login: (apiKey: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [apiKey]);

  const login = (newApiKey: string) => {
    setApiKey(newApiKey);
  };

  const logout = () => {
    setApiKey(null);
  };

  const isAuthenticated = () => {
    return apiKey !== null && apiKey.length > 0;
  };

  return (
    <AuthContext.Provider value={{ apiKey, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
