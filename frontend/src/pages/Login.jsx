
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  function validate() {
    const errors = {};

    if (!normalizedEmail) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setError('');

    const validationErrors = validate();
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        email: normalizedEmail,
        password,
      });

      login(data.token);

      let role = 'user';

      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        role = payload?.role ?? payload?.userRole ?? 'user';
      } catch {
        role = 'user';
      }

      navigate(role === 'admin' ? '/admin' : '/products');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  function handleEmailChange(e) {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
    if (error) setError('');
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
    if (error) setError('');
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">
          Sign in to access your account, cart, payment flow, and protected pages.
        </p>

        

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              className={fieldErrors.email ? 'input-error' : ''}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="email-error" className="field-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
              className={fieldErrors.password ? 'input-error' : ''}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <span id="password-error" className="field-error">
                {fieldErrors.password}
              </span>
            )}
            <span className="form-hint">
              Use the same credentials created during registration.
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create one here</Link>
        </p>
      </div>
    </div>
  );
}