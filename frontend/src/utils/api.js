/**
 * utils/api.js
 * Central axios instance used by every page and component.
 *
 * Security:
 *  - Base URL points to /api — Vite proxies this to localhost:5000 in dev,
 *    avoiding cross-origin requests entirely during development.
 *  - Request interceptor: reads the JWT from AuthContext and attaches it
 *    as the Authorization header on every request automatically.
 *    This means no individual page has to manually set the header.
 *  - Response interceptor: on any 401 response the token is cleared and
 *    the user is redirected to /login, preventing stale/expired tokens
 *    from silently failing in the background.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Module-level token store — updated by AuthContext via setApiToken()
// Stored here (not localStorage) so XSS cannot steal it
let _token = null;

export function setApiToken(token) {
  _token = token;
}

// Attach JWT to every outgoing request
api.interceptors.request.use((config) => {
  if (_token) {
    config.headers['Authorization'] = `Bearer ${_token}`;
  }
  return config;
});

// On 401: clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      _token = null;
      // Redirect without React Router (interceptor is outside component tree)
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
