export type Parish =
  | 'ANDORRA_LA_VELLA'
  | 'ESCALDES_ENGORDANY'
  | 'ENCAMP'
  | 'CANILLO'
  | 'LA_MASSANA'
  | 'ORDINO'
  | 'SANT_JULIA_DE_LORIA';

export type PriceRange = 1 | 2 | 3 | 4;

export type CuisineType =
  | 'pizza_pasta'
  | 'burgers'
  | 'sushi'
  | 'steakhouse'
  | 'seafood'
  | 'healthy'
  | 'asian'
  | 'mediterranean'
  | 'mexican'
  | 'tapas'
  | 'brunch'
  | 'fine_dining';

export interface RestaurantListItem {
  id: string;
  name: string;
  slug: string;
  cuisineType: string[];
  cuisine: string;
  priceRange: number;
  address: string;
  parish: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number | null;
  distance?: number | null;
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  coverImage: string | null;
  images: string[];
  isOpen: boolean;
}

export interface RestaurantDetail extends RestaurantListItem {
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  menuPdfUrl: string | null;
  hours: OpeningHours[];
}

export interface OpeningHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface AvailableSlot {
  id: string;
  time: string;
  availableCovers: number;
}
