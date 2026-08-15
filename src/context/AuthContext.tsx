import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getStoredCurrentUser, saveStoredCurrentUser } from '../lib/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (loginText: string, passText: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refreshUser: () => Promise<void>;
  switchUserSimulated: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lopes_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (currentToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setUser(data.user);
        saveStoredCurrentUser(data.user);
      } else {
        localStorage.removeItem('lopes_token');
        setToken(null);
        setUser(null);
        saveStoredCurrentUser(null);
      }
    } catch (e) {
      // If network offline, check stored user session
      const localUser = getStoredCurrentUser();
      if (localUser) {
        setUser(localUser);
      } else {
        localStorage.removeItem('lopes_token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (loginText: string, passText: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginText.trim(), password: passText.trim() })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.token && data.user) {
          localStorage.setItem('lopes_token', data.token);
          setToken(data.token);
          setUser(data.user);
          saveStoredCurrentUser(data.user);
          return { success: true };
        } else {
          return { success: false, error: data.error || 'Credenciais inválidas.' };
        }
      } else {
        return { success: false, error: 'Falha ao comunicar com o servidor. Tente novamente.' };
      }
    } catch (e: any) {
      return { success: false, error: 'Erro de conexão com o servidor. Verifique sua rede e tente novamente.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('lopes_token');
    saveStoredCurrentUser(null);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const currentToken = token || localStorage.getItem('lopes_token');
    if (currentToken) {
      await fetchCurrentUser(currentToken);
    }
  };

  const switchUserSimulated = async (userId: string) => {
    try {
      const currentToken = token || localStorage.getItem('lopes_token');
      const res = await fetch('/api/users', {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const targetUser = data.users.find((u: User) => u.id === userId);
        if (targetUser) {
          setUser(targetUser);
          saveStoredCurrentUser(targetUser);
        }
      }
    } catch (e) {
      console.error('Error switching user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        setUser,
        refreshUser,
        switchUserSimulated
      }}
    >
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
