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
  plan?: PlanType | null;
  externalReservationUrl?: string | null;
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
  time: string;
  serviceName: string;
  availableTables: number;
}

// ─── PLANES Y SUSCRIPCIONES ───────────────────────────────────
export type PlanType = 'RESERVATIONS' | 'LISTING_BASIC' | 'LISTING_FEATURED';

export type SubscriptionStatus =
  | 'INCOMPLETE'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'ADMIN_GRANT';

export interface SubscriptionInfo {
  id: string;
  restaurantId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  adminGranted: boolean;
  adminGrantUntil: string | null;
  cancelAtPeriodEnd: boolean;
}

export const PLAN_PRICING: Record<
  PlanType,
  { monthlyEur: number; perCoverEur: number; label: string; description: string }
> = {
  RESERVATIONS: {
    monthlyEur: 20,
    perCoverEur: 1,
    label: 'Taula Reservations',
    description: 'Sistema completo de reservas, agenda, mesas, menú y notificaciones.',
  },
  LISTING_BASIC: {
    monthlyEur: 49.99,
    perCoverEur: 0,
    label: 'Listing Basic',
    description: 'Aparece en el listado con tu enlace propio de reservas externo.',
  },
  LISTING_FEATURED: {
    monthlyEur: 99.99,
    perCoverEur: 0,
    label: 'Listing Featured',
    description: 'Listado destacado: badge, sección destacados y posición top en filtros.',
  },
};

// ─── OWNERSHIPS ───────────────────────────────────────────────
export type OwnerRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface OwnershipSummary {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  role: OwnerRole;
  plan: PlanType | null;
  subscriptionStatus: SubscriptionStatus | null;
}
