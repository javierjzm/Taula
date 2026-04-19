import { create } from 'zustand';
import { storage } from '../services/storage';

const STORAGE_KEY = 'taula_favorites';

interface FavoritesState {
  ids: Set<string>;
  loaded: boolean;
  toggle: (restaurantId: string) => void;
  isFav: (restaurantId: string) => boolean;
  load: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await storage.getItem(STORAGE_KEY);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        set({ ids: new Set(arr), loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  toggle: (restaurantId) => {
    const next = new Set(get().ids);
    if (next.has(restaurantId)) {
      next.delete(restaurantId);
    } else {
      next.add(restaurantId);
    }
    set({ ids: next });
    storage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  },

  isFav: (restaurantId) => get().ids.has(restaurantId),
}));
