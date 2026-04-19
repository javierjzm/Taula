export const ANDORRA_CENTER = {
  latitude: 42.5063,
  longitude: 1.5218,
};

export const ANDORRA_BOUNDS = {
  ne: [1.7865, 42.6559],
  sw: [1.4087, 42.4288],
} as const;

export const MAPBOX_ZOOM = 11;

export const PARISHES = [
  { id: 'ANDORRA_LA_VELLA', name: 'Andorra la Vella', latitude: 42.5063, longitude: 1.5218 },
  { id: 'ESCALDES_ENGORDANY', name: 'Escaldes-Engordany', latitude: 42.5095, longitude: 1.5388 },
  { id: 'ENCAMP', name: 'Encamp', latitude: 42.5340, longitude: 1.5805 },
  { id: 'CANILLO', name: 'Canillo', latitude: 42.5672, longitude: 1.5988 },
  { id: 'LA_MASSANA', name: 'La Massana', latitude: 42.5400, longitude: 1.5148 },
  { id: 'ORDINO', name: 'Ordino', latitude: 42.5558, longitude: 1.5330 },
  { id: 'SANT_JULIA_DE_LORIA', name: 'Sant Julià de Lòria', latitude: 42.4636, longitude: 1.4910 },
] as const;

export const CUISINE_TYPES = [
  { id: 'pizza_pasta', emoji: '🍕', label: 'Pizza & Pasta' },
  { id: 'burgers', emoji: '🍔', label: 'Burgers' },
  { id: 'sushi', emoji: '🍣', label: 'Sushi' },
  { id: 'steakhouse', emoji: '🥩', label: 'Steakhouse' },
  { id: 'seafood', emoji: '🦞', label: 'Seafood' },
  { id: 'healthy', emoji: '🥗', label: 'Healthy' },
  { id: 'asian', emoji: '🥢', label: 'Asian' },
  { id: 'mediterranean', emoji: '🫒', label: 'Mediterranean' },
  { id: 'mexican', emoji: '🌮', label: 'Mexican' },
  { id: 'tapas', emoji: '🥘', label: 'Tapas' },
  { id: 'brunch', emoji: '🥐', label: 'Brunch' },
  { id: 'fine_dining', emoji: '✨', label: 'Fine Dining' },
] as const;

export function getCuisineLabel(id: string, t?: (key: string) => string): string {
  const key = `cuisine.${id}`;
  if (t) {
    const translated = t(key);
    if (translated !== key) return translated;
  }
  const match = CUISINE_TYPES.find((ct) => ct.id === id);
  return match?.label ?? id;
}
