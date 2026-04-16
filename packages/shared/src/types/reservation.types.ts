export type ReservationStatus =
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
  date: string;
  time: string;
  partySize: number;
  specialRequests: string | null;
  status: ReservationStatus;
  createdAt: string;
}

export interface CreateReservationInput {
  restaurantId: string;
  slotId: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
}
