import { z } from 'zod';

export const restaurantFiltersSchema = z.object({
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  radius: z.coerce.number().default(5000),
  parish: z.string().optional(),
  cuisine: z.string().optional(),
  priceRange: z
    .string()
    .transform((v) => v.split(',').map(Number))
    .optional(),
  minRating: z.coerce.number().optional(),
  openNow: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().max(50).default(20),
  cursor: z.string().optional(),
});

export const restaurantRegisterSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  cuisineType: z.array(z.string()).min(1),
  priceRange: z.number().int().min(1).max(4),
  phone: z.string().optional(),
  email: z.string().email(),
  website: z.string().url().optional(),
  address: z.string(),
  parish: z.enum([
    'ANDORRA_LA_VELLA',
    'ESCALDES_ENGORDANY',
    'ENCAMP',
    'CANILLO',
    'LA_MASSANA',
    'ORDINO',
    'SANT_JULIA_DE_LORIA',
  ]),
  latitude: z.number(),
  longitude: z.number(),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8),
});
