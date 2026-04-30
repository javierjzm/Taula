import { create } from 'zustand';
import { api, setRestaurantTokens, clearRestaurantTokens } from '../services/api';
import { storage } from '../services/storage';
import type { OwnershipSummary } from '@taula/shared';

const MODE_KEY = 'taula_app_mode';
const ACTIVE_RESTAURANT_KEY = 'taula_active_restaurant';

export type AppMode = 'client' | 'restaurant';

interface ModeState {
  mode: AppMode;
  activeRestaurantId: string | null;
  activeRestaurantName: string | null;
  hydrated: boolean;
  /** Carga el modo y el restaurante activo persistidos. */
  hydrate: () => Promise<void>;
  /** Cambia a modo restaurante para el restaurante indicado. Pide token. */
  switchToRestaurant: (restaurantId: string, ownerships: OwnershipSummary[]) => Promise<void>;
  /** Vuelve a modo cliente y limpia el token de restaurante. */
  switchToClient: () => Promise<void>;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'client',
  activeRestaurantId: null,
  activeRestaurantName: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const mode = (await storage.getItem(MODE_KEY)) as AppMode | null;
      const activeRestaurantId = await storage.getItem(ACTIVE_RESTAURANT_KEY);
      set({
        mode: mode === 'restaurant' ? 'restaurant' : 'client',
        activeRestaurantId,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  switchToRestaurant: async (restaurantId, ownerships) => {
    const owner = ownerships.find((o) => o.restaurantId === restaurantId);
    if (!owner) throw new Error('No eres propietario de este restaurante');

    const res = await api<{
      accessToken: string;
      refreshToken: string;
      restaurantName: string;
      restaurantSlug: string;
    }>('/me/restaurant-token', {
      method: 'POST',
      body: JSON.stringify({ restaurantId }),
    });

    await setRestaurantTokens(res.accessToken, res.refreshToken);
    await storage.setItem(MODE_KEY, 'restaurant');
    await storage.setItem(ACTIVE_RESTAURANT_KEY, restaurantId);

    set({
      mode: 'restaurant',
      activeRestaurantId: restaurantId,
      activeRestaurantName: res.restaurantName ?? owner.restaurantName,
    });
  },

  switchToClient: async () => {
    await clearRestaurantTokens();
    await storage.setItem(MODE_KEY, 'client');
    await storage.removeItem(ACTIVE_RESTAURANT_KEY);
    set({ mode: 'client', activeRestaurantId: null, activeRestaurantName: null });
    void get();
  },
}));
