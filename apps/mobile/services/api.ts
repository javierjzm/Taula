import { storage } from './storage';
import Constants from 'expo-constants';

const ensureV1 = (url: string): string => {
  const clean = url.replace(/\/+$/, '');
  return clean.endsWith('/v1') ? clean : `${clean}/v1`;
};

const resolveApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return ensureV1(process.env.EXPO_PUBLIC_API_URL);
  }

  // In Expo Go/dev, infer host from Metro URL so physical devices can hit local API.
  const hostUri = (Constants.expoConfig as any)?.hostUri as string | undefined;
  const inferredHost = hostUri?.split(':')[0];
  if (inferredHost) {
    return `http://${inferredHost}:3000/v1`;
  }

  return 'http://localhost:3000/v1';
};

const API_URL = resolveApiUrl();

const USER_ACCESS = 'accessToken';
const USER_REFRESH = 'refreshToken';
const REST_ACCESS = 'restAccessToken';
const REST_REFRESH = 'restRefreshToken';

const getUserToken = async (): Promise<string | null> => storage.getItem(USER_ACCESS);
const getRestaurantToken = async (): Promise<string | null> => storage.getItem(REST_ACCESS);

const setTokens = async (accessToken: string, refreshToken: string) => {
  await storage.setItem(USER_ACCESS, accessToken);
  await storage.setItem(USER_REFRESH, refreshToken);
};

export const setRestaurantTokens = async (accessToken: string, refreshToken: string) => {
  await storage.setItem(REST_ACCESS, accessToken);
  await storage.setItem(REST_REFRESH, refreshToken);
};

export const clearTokens = async () => {
  await storage.removeItem(USER_ACCESS);
  await storage.removeItem(USER_REFRESH);
  await storage.removeItem(REST_ACCESS);
  await storage.removeItem(REST_REFRESH);
};

export const clearRestaurantTokens = async () => {
  await storage.removeItem(REST_ACCESS);
  await storage.removeItem(REST_REFRESH);
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await storage.getItem(USER_REFRESH);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    await clearTokens();
    return null;
  }
};

type RequestKind = 'user' | 'restaurant';

async function request<T>(
  endpoint: string,
  options: RequestInit,
  kind: RequestKind,
): Promise<T> {
  const token = kind === 'restaurant' ? await getRestaurantToken() : await getUserToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa API_URL y que la API esté levantada.');
  }

  if (res.status === 401 && token && kind === 'user') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders: HeadersInit = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      try {
        res = await fetch(`${API_URL}${endpoint}`, { ...options, headers: retryHeaders });
      } catch {
        throw new Error('No se pudo conectar con el servidor tras refrescar sesión.');
      }
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error de red' }));
    throw Object.assign(new Error(error.message || `Error ${res.status}`), {
      status: res.status,
      code: error.code,
    });
  }

  return res.json();
}

export const api = <T = any>(endpoint: string, options: RequestInit = {}) =>
  request<T>(endpoint, options, 'user');

export const apiRestaurant = <T = any>(endpoint: string, options: RequestInit = {}) =>
  request<T>(endpoint, options, 'restaurant');

export { setTokens };
