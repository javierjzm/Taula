export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'NO_SHOW'
  | 'CANCELLED_USER'
  | 'CANCELLED_RESTAURANT';

export interface Reservation {
  id: string;
  code: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCover: string | null;
  restaurantAddress: string;
  restaurantSlug: string;
  date: string;
  time: string;
  partySize: number;
  zoneId: string | null;
  zoneName: string | null;
  tableName: string | null;
  specialRequests: string | null;
  status: ReservationStatus;
  cardGuarantee: boolean;
  noShowCharged: boolean;
  noShowAmount: number | null;
  createdAt: string;
}

export interface CreateReservationInput {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  zoneId?: string;
  specialRequests?: string;
}
