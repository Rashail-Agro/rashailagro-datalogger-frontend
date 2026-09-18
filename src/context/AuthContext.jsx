import { createContext, useContext, useState, useCallback } from 'react';
import { login as loginRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ws_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('ws_token'));

  // The login endpoint returns only a token, so the signed-in name shown in
  // the UI is the username that was entered rather than anything server-side.
  const login = useCallback(async (username, password) => {
    const data = await loginRequest(username, password);
    const nextUser = { username };
    setUser(nextUser);
    setToken(data.token);
    localStorage.setItem('ws_token', data.token);
    localStorage.setItem('ws_user', JSON.stringify(nextUser));
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ws_token');
    localStorage.removeItem('ws_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
