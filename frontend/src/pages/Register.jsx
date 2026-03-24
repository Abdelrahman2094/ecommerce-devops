import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Register() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const normalizedEmail = useMemo(
    () => form.email.trim().toLowerCase(),
    [form.email]
  );

  function update(field) {
    return e => {
      const value = e.target.value;

      setForm(prev => ({ ...prev, [field]: value }));

      if (fieldErrors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
      }

      if (error) setError('');
      if (success) setSuccess('');
    };
  }

  function getPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  }

  function validate() {
    const errors = {};
    const trimmedName = form.fullName.trim();

    if (!trimmedName) {
      errors.fullName = 'Full name is required.';
    } else if (trimmedName.length < 3) {
      errors.fullName = 'Full name must be at least 3 characters.';
    }

    if (!normalizedEmail) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (getPasswordStrength(form.password) < 3) {
      errors.password =
        'Use a stronger password with uppercase letters, numbers, and symbols.';
    }

    if (!form.confirm) {
      errors.confirm = 'Please confirm your password.';
    } else if (form.password !== form.confirm) {
      errors.confirm = 'Passwords do not match.';
    }

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    setError('');
    setSuccess('');

    const validationErrors = validate();
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    try {
      await api.post('/auth/register', {
        fullName: form.fullName.trim(),
        email: normalizedEmail,
        password: form.password,
      });

      setSuccess('Account created successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1400);
    } catch {
      setError('Registration failed. Please review your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-subtitle">
          Join SecureCart with stronger password protection and safe registration.
        </p>

        

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              value={form.fullName}
              onChange={update('fullName')}
              placeholder="Ahmed Nasreldin"
              autoComplete="name"
              disabled={loading}
              className={fieldErrors.fullName ? 'input-error' : ''}
              aria-invalid={!!fieldErrors.fullName}
              aria-describedby={fieldErrors.fullName ? 'fullname-error' : undefined}
            />
            {fieldErrors.fullName && (
              <span id="fullname-error" className="field-error">
                {fieldErrors.fullName}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              className={fieldErrors.email ? 'input-error' : ''}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            />
            {fieldErrors.email && (
              <span id="register-email-error" className="field-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={loading}
              className={fieldErrors.password ? 'input-error' : ''}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
            />
            {fieldErrors.password && (
              <span id="register-password-error" className="field-error">
                {fieldErrors.password}
              </span>
            )}

            {form.password.length > 0 && (
              <PasswordStrength password={form.password} />
            )}

            <span className="form-hint">
              Use at least 8 characters, including uppercase letters, numbers, and symbols.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              value={form.confirm}
              onChange={update('confirm')}
              placeholder="Repeat your password"
              autoComplete="new-password"
              disabled={loading}
              className={fieldErrors.confirm ? 'input-error' : ''}
              aria-invalid={!!fieldErrors.confirm}
              aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
            />
            {fieldErrors.confirm && (
              <span id="confirm-error" className="field-error">
                {fieldErrors.confirm}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const classes = [
    '',
    'strength-weak',
    'strength-fair',
    'strength-good',
    'strength-strong',
  ];

  return (
    <div className="password-strength">
      <div className="strength-bars">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`strength-bar ${i <= strength ? classes[strength] : ''}`}
          />
        ))}
      </div>
      <span className={classes[strength]}>{labels[strength]}</span>
    </div>
  );
}