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

const getToken = async (): Promise<string | null> => {
  return storage.getItem('accessToken');
};

const setTokens = async (accessToken: string, refreshToken: string) => {
  await storage.setItem('accessToken', accessToken);
  await storage.setItem('refreshToken', refreshToken);
};

export const clearTokens = async () => {
  await storage.removeItem('accessToken');
  await storage.removeItem('refreshToken');
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await storage.getItem('refreshToken');
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

export const api = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getToken();

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

  if (res.status === 401 && token) {
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
    throw new Error(error.message || `Error ${res.status}`);
  }

  return res.json();
};

export { setTokens };
