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
  | 'andorrana'
  | 'espanyola'
  | 'francesa'
  | 'italiana'
  | 'japonesa'
  | 'americana'
  | 'vegetariana'
  | 'internacional'
  | 'grill'
  | 'mariscos'
  | 'pizza'
  | 'burguer';

export interface RestaurantListItem {
  id: string;
  name: string;
  slug: string;
  cuisineType: CuisineType[];
  priceRange: PriceRange;
  address: string;
  parish: Parish;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  coverImage: string | null;
  isOpenNow: boolean;
  nextAvailableSlot: string | null;
}

export interface RestaurantDetail extends RestaurantListItem {
  description: string | null;
  phone: string | null;
  website: string | null;
  images: string[];
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
