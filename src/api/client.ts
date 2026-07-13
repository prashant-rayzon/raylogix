import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '@/api/runtime';

const BASE_URL = getApiBaseUrl();

const getTenantSubdomain = () => {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1') return '';

  const parts = hostname.split('.');
  if (hostname.endsWith('.localhost')) {
    const subdomain = parts[0];
    return subdomain && subdomain !== 'admin' ? subdomain : '';
  }

  if (parts.length > 2) {
    const subdomain = parts.slice(0, -2).join('.');
    return subdomain === 'admin' ? '' : subdomain;
  }

  return '';
};

// Custom error types
export class PermissionDeniedError extends Error {
  constructor(message = 'Permission Denied') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication Required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Create axios instance
const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach access token
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authState = localStorage.getItem('auth');
    
    if (authState) {
      try {
        const { accessToken } = JSON.parse(authState);
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } catch (e) {
        console.error('Error parsing auth state:', e);
      }
    }

    const tenantSubdomain = getTenantSubdomain();
    if (tenantSubdomain) {
      config.headers['X-Tenant-Subdomain'] = tenantSubdomain;
    } else {
      delete config.headers['X-Tenant-Subdomain'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh and permission errors
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 403 Forbidden - Permission Denied
    if (error.response?.status === 403) {
      const data = error.response.data as any;
      const message = data?.message || 'You do not have permission to access this resource';
      
      // Emit event for global permission denied handling
      const event = new CustomEvent('permissionDenied', {
        detail: {
          message,
          url: error.config?.url,
          method: error.config?.method,
          status: 403,
        },
      });
      window.dispatchEvent(event);

      return Promise.reject(new PermissionDeniedError(message));
    }

    // If 401 and not already retried, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authState = localStorage.getItem('auth');
        if (!authState) {
          throw new Error('No auth state');
        }

        const { refreshToken } = JSON.parse(authState);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Call refresh endpoint
        const headers: Record<string, string> = {};
        const tenantSubdomain = getTenantSubdomain();
        if (tenantSubdomain) {
          headers['X-Tenant-Subdomain'] = tenantSubdomain;
        }

        const response = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { headers }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update stored tokens
        const updatedAuth = {
          ...JSON.parse(authState),
          accessToken,
          refreshToken: newRefreshToken,
        };
        localStorage.setItem('auth', JSON.stringify(updatedAuth));

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to sign-in
        localStorage.removeItem('auth');
        window.location.href = '/sign-in';
        return Promise.reject(new AuthenticationError('Session expired. Please sign in again.'));
      }
    }

    return Promise.reject(error);
  }
);

export default client;
