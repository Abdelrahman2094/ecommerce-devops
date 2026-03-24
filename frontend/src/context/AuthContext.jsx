import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setApiToken } from '../utils/api';

const AuthContext = createContext(null);

function parseJwtPayload(jwt) {
  try {
    if (!jwt || typeof jwt !== 'string') return null;

    const parts = jwt.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');

    if (!savedToken) {
      setAuthLoading(false);
      return;
    }

    const payload = parseJwtPayload(savedToken);

    if (!payload) {
      localStorage.removeItem('token');
      setApiToken(null);
      setAuthLoading(false);
      return;
    }

    setToken(savedToken);
    setUser({
      id: payload.sub ?? payload.id ?? null,
      role: payload.role ?? payload.userRole ?? 'user',
      email: payload.email ?? null,
      name: payload.name ?? payload.username ?? null,
    });
    setApiToken(savedToken);
    setAuthLoading(false);
  }, []);

  function login(jwt) {
    const payload = parseJwtPayload(jwt);

    setToken(jwt);
    setApiToken(jwt);
    localStorage.setItem('token', jwt);

    if (payload) {
      setUser({
        id: payload.sub ?? payload.id ?? null,
        role: payload.role ?? payload.userRole ?? 'user',
        email: payload.email ?? null,
        name: payload.name ?? payload.username ?? null,
      });
    } else {
      setUser(null);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setApiToken(null);
    localStorage.removeItem('token');
  }

  const isAuthenticated = !!token;
  const isAdmin =
    user?.role === 'admin' ||
    user?.isAdmin === true ||
    user?.userType === 'admin';

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      authLoading,
    }),
    [token, user, isAuthenticated, isAdmin, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}