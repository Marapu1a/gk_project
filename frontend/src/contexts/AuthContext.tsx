import { createContext, useContext, useEffect, useState } from 'react';
import { getAuthToken, saveAuth, clearAuth } from '@/utils/auth';

type AuthContextType = {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isInitialized: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const stored = getAuthToken();
    setToken(stored || null);
    setIsInitialized(true);
  }, []);

  const login = (token: string) => {
    saveAuth(token);
    setToken(token);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
