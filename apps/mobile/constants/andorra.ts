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
  { id: 'ANDORRA_LA_VELLA', name: 'Andorra la Vella' },
  { id: 'ESCALDES_ENGORDANY', name: 'Escaldes-Engordany' },
  { id: 'ENCAMP', name: 'Encamp' },
  { id: 'CANILLO', name: 'Canillo' },
  { id: 'LA_MASSANA', name: 'La Massana' },
  { id: 'ORDINO', name: 'Ordino' },
  { id: 'SANT_JULIA_DE_LORIA', name: 'Sant Julià de Lòria' },
] as const;

export const CUISINE_TYPES = [
  { id: 'andorrana', emoji: '🏔️', label: 'Andorrana' },
  { id: 'espanyola', emoji: '🇪🇸', label: 'Espanyola' },
  { id: 'francesa', emoji: '🇫🇷', label: 'Francesa' },
  { id: 'italiana', emoji: '🇮🇹', label: 'Italiana' },
  { id: 'japonesa', emoji: '🇯🇵', label: 'Japonesa' },
  { id: 'americana', emoji: '🇺🇸', label: 'Americana' },
  { id: 'vegetariana', emoji: '🥬', label: 'Vegetariana' },
  { id: 'internacional', emoji: '🌍', label: 'Internacional' },
  { id: 'grill', emoji: '🔥', label: 'Grill' },
  { id: 'mariscos', emoji: '🦐', label: 'Mariscos' },
  { id: 'pizza', emoji: '🍕', label: 'Pizza' },
  { id: 'burguer', emoji: '🍔', label: 'Burguer' },
] as const;
