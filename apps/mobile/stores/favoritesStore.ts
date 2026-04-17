import { create } from 'zustand';

interface FavoritesState {
  ids: Set<string>;
  toggle: (restaurantId: string) => void;
  isFav: (restaurantId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),

  toggle: (restaurantId) => {
    const next = new Set(get().ids);
    if (next.has(restaurantId)) {
      next.delete(restaurantId);
    } else {
      next.add(restaurantId);
    }
    set({ ids: next });
  },

  isFav: (restaurantId) => get().ids.has(restaurantId),
}));
