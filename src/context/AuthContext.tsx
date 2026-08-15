import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getStoredCurrentUser, saveStoredCurrentUser, findUserByLogin, validateUserPassword, getStoredUsers } from '../lib/storage';

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
        if (data.user) {
          setUser(data.user);
          saveStoredCurrentUser(data.user);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error fetching /api/auth/me:', e);
    }

    // Resilient offline/local fallback
    const localUser = getStoredCurrentUser();
    if (localUser) {
      setUser(localUser);
    } else if (currentToken.startsWith('lopes_token_')) {
      const uId = currentToken.replace('lopes_token_', '');
      const users = getStoredUsers();
      const match = users.find(u => u.id === uId);
      if (match) {
        setUser(match);
        saveStoredCurrentUser(match);
      } else {
        localStorage.removeItem('lopes_token');
        setToken(null);
        setUser(null);
        saveStoredCurrentUser(null);
      }
    } else {
      localStorage.removeItem('lopes_token');
      setToken(null);
      setUser(null);
      saveStoredCurrentUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (loginText: string, passText: string) => {
    const cleanLogin = loginText.trim();
    const cleanPass = passText.trim();

    if (!cleanLogin || !cleanPass) {
      return { success: false, error: 'Por favor, preencha o usuário e a senha.' };
    }

    // 1. First attempt Cloud / Backend API
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: cleanLogin, password: cleanPass })
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
          // Explicit failure message from server
          return { success: false, error: data.error || 'Credenciais inválidas.' };
        }
      }
    } catch (e: any) {
      console.warn('Backend API login request failed, evaluating local resilience engine:', e);
    }

    // 2. Local resilient fallback authentication
    const localUser = findUserByLogin(cleanLogin);
    if (!localUser) {
      return { success: false, error: 'Usuário ou e-mail não encontrado.' };
    }

    if (localUser.status === 'blocked') {
      return { success: false, error: 'Acesso bloqueado pelo Administrador Master.' };
    }

    const isValid = validateUserPassword(localUser.id, cleanPass);
    if (!isValid) {
      return { success: false, error: 'Senha incorreta. Verifique a senha digitada ou contate o Administrador.' };
    }

    const fallbackToken = `lopes_token_${localUser.id}`;
    localStorage.setItem('lopes_token', fallbackToken);
    setToken(fallbackToken);
    setUser(localUser);
    saveStoredCurrentUser(localUser);
    return { success: true };
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
        const targetUser = (data.users || []).find((u: User) => u.id === userId);
        if (targetUser) {
          setUser(targetUser);
          saveStoredCurrentUser(targetUser);
          return;
        }
      }
    } catch (e) {
      console.error('Error switching user via API:', e);
    }

    // Local fallback
    const users = getStoredUsers();
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      setUser(targetUser);
      saveStoredCurrentUser(targetUser);
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

