import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const isAdmin =
    user?.role === 'admin' ||
    user?.isAdmin === true ||
    user?.userType === 'admin';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function getDisplayName() {
    if (user?.name) return user.name;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <Link to={isAuthenticated ? '/products' : '/login'}>
            <div className="brand-mark">SC</div>

            <div className="brand-text">
              <span className="brand-title">SecureCart</span>
              <span className="brand-subtitle">Secure Commerce</span>
            </div>
          </Link>
        </div>

        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/products"
                className={({ isActive }) => (isActive ? 'active-link' : '')}
              >
                Products
              </NavLink>

              <NavLink
                to="/cart"
                className={({ isActive }) =>
                  `cart-link ${isActive ? 'active-link' : ''}`.trim()
                }
              >
                Cart
                {count > 0 && <span className="cart-badge">{count}</span>}
              </NavLink>

              <NavLink
                to="/payment"
                className={({ isActive }) => (isActive ? 'active-link' : '')}
              >
                Payment
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => (isActive ? 'active-link' : '')}
                >
                  Admin
                </NavLink>
              )}

              <span className="navbar-user">
                <span>{getDisplayName()}</span>
                <span className={`user-role-badge ${isAdmin ? 'admin' : ''}`}>
                  {isAdmin ? 'Admin' : 'User'}
                </span>
              </span>

              <button className="btn-link" onClick={handleLogout} type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? 'active-link' : '')}
              >
                Login
              </NavLink>

              <NavLink
                to="/register"
                className={({ isActive }) => (isActive ? 'active-link' : '')}
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}