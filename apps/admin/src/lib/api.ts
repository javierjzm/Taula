import axios from 'axios';

const STORAGE_KEY = 'taula_admin_api_key';

export function getAdminKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setAdminKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearAdminKey() {
  localStorage.removeItem(STORAGE_KEY);
}

export const api = axios.create({
  baseURL: '/v1/admin',
});

api.interceptors.request.use((config) => {
  const key = getAdminKey();
  if (key) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['x-admin-key'] = key;
  }
  return config;
});
