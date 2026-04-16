import { create } from 'zustand';

interface FiltersState {
  parish: string | null;
  cuisine: string | null;
  priceRange: number[];
  minRating: number | null;
  openNow: boolean;
  setParish: (parish: string | null) => void;
  setCuisine: (cuisine: string | null) => void;
  setPriceRange: (range: number[]) => void;
  setMinRating: (rating: number | null) => void;
  toggleOpenNow: () => void;
  resetFilters: () => void;
  activeFiltersCount: () => number;
}

export const useFiltersStore = create<FiltersState>((set, get) => ({
  parish: null,
  cuisine: null,
  priceRange: [],
  minRating: null,
  openNow: false,
  setParish: (parish) => set({ parish }),
  setCuisine: (cuisine) => set({ cuisine }),
  setPriceRange: (priceRange) => set({ priceRange }),
  setMinRating: (minRating) => set({ minRating }),
  toggleOpenNow: () => set((state) => ({ openNow: !state.openNow })),
  resetFilters: () =>
    set({ parish: null, cuisine: null, priceRange: [], minRating: null, openNow: false }),
  activeFiltersCount: () => {
    const state = get();
    let count = 0;
    if (state.parish) count++;
    if (state.cuisine) count++;
    if (state.priceRange.length) count++;
    if (state.minRating) count++;
    if (state.openNow) count++;
    return count;
  },
}));
