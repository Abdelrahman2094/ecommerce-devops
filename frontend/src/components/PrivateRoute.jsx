import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <div className="page-loading">Restoring session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/products" replace />;
  }

  return children;
}