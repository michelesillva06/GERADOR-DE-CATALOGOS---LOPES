import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getStoredCurrentUser, saveStoredCurrentUser, findUserByLogin, getStoredUsers, validateUserPassword, updateUserPassword } from '../lib/storage';

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
        // Static hosting fallback
        const localUser = getStoredCurrentUser();
        if (localUser) {
          setUser(localUser);
        } else {
          localStorage.removeItem('lopes_token');
          setToken(null);
          setUser(null);
        }
      }
    } catch {
      // Offline / Static hosting fallback
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
      const localUser = getStoredCurrentUser();
      if (localUser) {
        setUser(localUser);
        setToken(`lopes_token_${localUser.id}`);
      }
      setLoading(false);
    }
  }, [token]);

  const login = async (loginText: string, passText: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginText, password: passText })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        localStorage.setItem('lopes_token', data.token);
        setToken(data.token);
        setUser(data.user);
        saveStoredCurrentUser(data.user);
        updateUserPassword(data.user.id, passText);
        return { success: true };
      } else if (contentType.includes('application/json')) {
        // Handle actual server non-200 responses strictly with json error
        let errorMsg = 'Senha incorreta ou usuário não encontrado.';
        try {
          const data = await res.json();
          if (data && data.error) {
            errorMsg = data.error;
          }
        } catch {}

        return { success: false, error: errorMsg };
      } else {
        // If the server doesn't return JSON, it means the API is either not found (404 returning index.html)
        // or there's a gateway error. We log it and fall through to client-side mode.
        console.warn('Backend API returned non-JSON response, falling back to client auth mode.');
      }
    } catch (e) {
      console.warn('Backend API connection failed, switching to client auth mode:', e);
    }

    // Client-side fallback for static servers or offline mode
    const localUser = findUserByLogin(loginText);
    if (localUser) {
      if (localUser.status === 'blocked') {
        return { success: false, error: 'Usuário bloqueado pelo administrador.' };
      }

      const isValid = validateUserPassword(localUser.id, passText);
      if (!isValid) {
        return { success: false, error: 'Senha incorreta.' };
      }

      saveStoredCurrentUser(localUser);
      setToken(`lopes_token_${localUser.id}`);
      setUser(localUser);
      return { success: true };
    }

    return { success: false, error: 'Usuário não encontrado. Verifique suas credenciais.' };
  };

  const logout = () => {
    saveStoredCurrentUser(null);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    } else {
      const localUser = getStoredCurrentUser();
      if (localUser) setUser(localUser);
    }
  };

  const switchUserSimulated = async (userId: string) => {
    try {
      const res = await fetch('/api/users');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const targetUser = data.users.find((u: User) => u.id === userId);
        if (targetUser) {
          setUser(targetUser);
          saveStoredCurrentUser(targetUser);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Local fallback
    const users = getStoredUsers();
    const targetUser = users.find((u: User) => u.id === userId);
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

