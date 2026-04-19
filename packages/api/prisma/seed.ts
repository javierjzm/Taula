import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface RestaurantSeed {
  name: string;
  slug: string;
  description: string;
  cuisineType: string[];
  priceRange: number;
  phone: string;
  email: string;
  website: string;
  address: string;
  parish: 'ANDORRA_LA_VELLA' | 'ESCALDES_ENGORDANY' | 'ENCAMP' | 'CANILLO' | 'LA_MASSANA' | 'ORDINO' | 'SANT_JULIA_DE_LORIA';
  latitude: number;
  longitude: number;
  isActive: boolean;
  isFeatured: boolean;
  coverImage: string;
  images: string[];
  avgRating: number;
  reviewCount: number;
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[];
  zones: { name: string; tables: { label: string; minCovers: number; maxCovers: number }[] }[];
  services: { name: string; startTime: string; endTime: string; slotInterval: number; turnDuration: number; daysOfWeek: number[] }[];
  menu?: { name: string; sortOrder?: number; items: { name: string; description?: string; price: number; image?: string; allergens?: string[]; isPopular?: boolean; sortOrder?: number }[] }[];
  offers?: { title: string; description?: string; type: string; value: number; daysOfWeek?: number[]; startTime?: string; endTime?: string }[];
}

const RESTAURANTS_SEED: RestaurantSeed[] = [
  {
    name: 'Borda Jovell',
    slug: 'borda-jovell',
    description: 'Traditional mountain cuisine in a 17th-century stone borda. Grilled meats over open flame, local cheeses, and panoramic valley views.',
    cuisineType: ['steakhouse', 'fine_dining'],
    priceRange: 3,
    phone: '+376 835 151',
    email: 'reservas@bordajovell.ad',
    website: 'https://bordajovell.ad',
    address: "Ctra. de l'Obac, s/n, Ordino",
    parish: 'ORDINO',
    latitude: 42.5558, longitude: 1.5330,
    isActive: true, isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop'],
    avgRating: 4.6, reviewCount: 187,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 3, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '23:00', isClosed: false },
    ],
    zones: [
      { name: 'Interior', tables: [
        { label: 'T1', minCovers: 2, maxCovers: 4 }, { label: 'T2', minCovers: 2, maxCovers: 4 },
        { label: 'T3', minCovers: 2, maxCovers: 6 }, { label: 'T4', minCovers: 4, maxCovers: 8 },
        { label: 'T5', minCovers: 2, maxCovers: 2 }, { label: 'T6', minCovers: 2, maxCovers: 2 },
      ]},
      { name: 'Terrassa', tables: [
        { label: 'E1', minCovers: 2, maxCovers: 4 }, { label: 'E2', minCovers: 2, maxCovers: 4 },
        { label: 'E3', minCovers: 2, maxCovers: 6 }, { label: 'E4', minCovers: 2, maxCovers: 4 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '12:00', endTime: '16:00', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 2, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '19:30', endTime: '22:00', slotInterval: 30, turnDuration: 120, daysOfWeek: [0, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Entrants', sortOrder: 0, items: [
        { name: 'Trinxat de muntanya', description: 'Patata, col i cansalada cruixent', price: 12.5, image: 'https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?w=600&h=400&fit=crop', allergens: ['dairy'], isPopular: true },
        { name: 'Escudella', description: 'Sopa tradicional amb pilota i verdures', price: 14, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop', allergens: ['gluten'] },
        { name: 'Embotits artesans', description: 'Selecció de fuet, llonganissa i pernil ibèric', price: 16, image: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=600&h=400&fit=crop', allergens: [] },
        { name: 'Amanida de cabra i nous', description: 'Formatge de cabra gratinat, nous caramelitzades i vinagreta de mel', price: 13, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop', allergens: ['dairy', 'nuts'] },
      ]},
      { name: 'Carns a la brasa', sortOrder: 1, items: [
        { name: 'Chuletón de bou (1kg)', description: 'Vedella madurada 45 dies, brasa de llenya', price: 58, image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop', isPopular: true },
        { name: 'Xai a la brasa', description: 'Costella de xai amb herbes de muntanya', price: 28, image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&h=400&fit=crop', allergens: [] },
        { name: 'Botifarra amb mongetes', description: 'Botifarra artesana amb mongetes del ganxet', price: 22, image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&h=400&fit=crop', allergens: ['gluten'] },
        { name: 'Magret d\'ànec', description: 'Amb salsa de fruits del bosc', price: 26, image: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=600&h=400&fit=crop', allergens: [] },
      ]},
      { name: 'Peixos', sortOrder: 2, items: [
        { name: 'Truita de riu', description: 'Truita fresca amb ametlles torrades', price: 24, image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&h=400&fit=crop', allergens: ['fish', 'nuts'] },
        { name: 'Bacallà a la llauna', description: 'Amb tomàquet, pebrot i olives', price: 22, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop', allergens: ['fish'] },
      ]},
      { name: 'Postres', sortOrder: 3, items: [
        { name: 'Crema catalana', description: 'Amb sucre torrat', price: 8, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop', allergens: ['eggs', 'dairy'], isPopular: true },
        { name: 'Coca de recapte', description: 'Amb xocolata de muntanya', price: 9, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'] },
        { name: 'Formatge amb codonyat', description: 'Formatge artesà andorrà amb codonyat casolà', price: 10, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600&h=400&fit=crop', allergens: ['dairy'] },
      ]},
    ],
    offers: [
      { title: '-20% entre setmana', description: 'De dimarts a dijous al sopar', type: 'PERCENTAGE', value: 20, daysOfWeek: [2, 3, 4], startTime: '19:30', endTime: '22:00' },
      { title: 'Menú brasa', description: 'Entrant + carn a la brasa + postre + vi', type: 'SPECIAL_MENU', value: 42, daysOfWeek: [5, 6] },
    ],
  },
  {
    name: 'Restaurant Can Manel',
    slug: 'can-manel',
    description: 'Family-run since 1982. Market-fresh Mediterranean sharing plates, homemade desserts and curated Catalan wines.',
    cuisineType: ['mediterranean', 'tapas'],
    priceRange: 2,
    phone: '+376 869 264', email: 'info@canmanel.ad', website: 'https://canmanel.ad',
    address: 'Carrer de la Vall, 25, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA',
    latitude: 42.5063, longitude: 1.5218,
    isActive: true, isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop'],
    avgRating: 4.3, reviewCount: 312,
    hours: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, openTime: '13:00', closeTime: i >= 5 ? '23:00' : '22:00', isClosed: false })),
    zones: [
      { name: 'Sala principal', tables: [
        { label: 'M1', minCovers: 2, maxCovers: 4 }, { label: 'M2', minCovers: 2, maxCovers: 4 },
        { label: 'M3', minCovers: 2, maxCovers: 6 }, { label: 'M4', minCovers: 1, maxCovers: 2 },
        { label: 'M5', minCovers: 1, maxCovers: 2 }, { label: 'M6', minCovers: 4, maxCovers: 8 },
        { label: 'M7', minCovers: 2, maxCovers: 4 }, { label: 'M8', minCovers: 2, maxCovers: 4 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '13:00', endTime: '16:00', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '20:00', endTime: '22:00', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Tapes', sortOrder: 0, items: [
        { name: 'Patates braves', description: 'Amb salsa brava casolana i allioli', price: 8, image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=600&h=400&fit=crop', allergens: ['gluten'], isPopular: true },
        { name: 'Calamars a la romana', description: 'Amb llimona i allioli', price: 12, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=400&fit=crop', allergens: ['gluten', 'molluscs'] },
        { name: 'Pernil ibèric 5J', description: 'Tallat a mà, 36 mesos', price: 22, image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=400&fit=crop' },
        { name: 'Pa amb tomàquet', description: 'Pa de cristall amb tomàquet ratllat i AOVE', price: 5, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', allergens: ['gluten'] },
      ]},
      { name: 'Principals', sortOrder: 1, items: [
        { name: 'Paella mixta', description: 'Arròs, marisc, pollastre i verdures (2 pers.)', price: 32, image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=600&h=400&fit=crop', allergens: ['crustaceans', 'molluscs'], isPopular: true },
        { name: 'Bacallà amb samfaina', description: 'Bacallà confitat amb verdures de temporada', price: 19, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop', allergens: ['fish'] },
        { name: 'Fideuà negra', description: 'Amb calamar de potera i allioli de safrà', price: 18, image: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=600&h=400&fit=crop', allergens: ['gluten', 'molluscs', 'eggs'] },
      ]},
      { name: 'Postres', sortOrder: 2, items: [
        { name: 'Tiramisú casolà', description: 'Recepta clàssica italiana', price: 8, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop', allergens: ['eggs', 'dairy', 'gluten'], isPopular: true },
        { name: 'Crema cremada', description: 'Amb vainilla de Madagascar', price: 7, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop', allergens: ['eggs', 'dairy'] },
      ]},
    ],
    offers: [
      { title: '-15% a migdia', description: 'En tota la carta al migdia', type: 'PERCENTAGE', value: 15, daysOfWeek: [1, 2, 3, 4, 5], startTime: '13:00', endTime: '16:00' },
      { title: 'Paella per 2 + begudes', description: 'Paella + 2 begudes + 2 postres', type: 'SPECIAL_MENU', value: 45, daysOfWeek: [0, 6] },
    ],
  },
  {
    name: 'Koi Sushi Andorra',
    slug: 'koi-sushi-andorra',
    description: 'Premium omakase and creative maki rolls with fish flown daily. Minimalist interior and 30+ sakè labels.',
    cuisineType: ['sushi', 'asian'],
    priceRange: 3,
    phone: '+376 812 345', email: 'hello@koisushi.ad', website: 'https://koisushi.ad',
    address: 'Avinguda Meritxell, 89, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA',
    latitude: 42.5075, longitude: 1.5280,
    isActive: true, isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=600&fit=crop'],
    avgRating: 4.7, reviewCount: 224,
    hours: [
      { dayOfWeek: 0, openTime: '13:00', closeTime: '23:00', isClosed: true },
      ...([1, 2, 3, 4].map((d) => ({ dayOfWeek: d, openTime: '13:00', closeTime: '23:00', isClosed: false }))),
      { dayOfWeek: 5, openTime: '13:00', closeTime: '00:00', isClosed: false },
      { dayOfWeek: 6, openTime: '13:00', closeTime: '00:00', isClosed: false },
    ],
    zones: [
      { name: 'Barra sushi', tables: [
        { label: 'B1', minCovers: 1, maxCovers: 2 }, { label: 'B2', minCovers: 1, maxCovers: 2 },
        { label: 'B3', minCovers: 1, maxCovers: 2 }, { label: 'B4', minCovers: 1, maxCovers: 2 },
      ]},
      { name: 'Sala', tables: [
        { label: 'S1', minCovers: 2, maxCovers: 4 }, { label: 'S2', minCovers: 2, maxCovers: 4 },
        { label: 'S3', minCovers: 2, maxCovers: 6 }, { label: 'S4', minCovers: 4, maxCovers: 8 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '13:00', endTime: '15:30', slotInterval: 30, turnDuration: 90, daysOfWeek: [1, 2, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '19:30', endTime: '23:00', slotInterval: 30, turnDuration: 120, daysOfWeek: [1, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Sushi & Sashimi', sortOrder: 0, items: [
        { name: 'Nigiri Premium (8 pces)', description: 'Salmó, tonyina, gamba, llobarro', price: 24, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&h=400&fit=crop', allergens: ['fish', 'crustaceans'], isPopular: true },
        { name: 'Sashimi mixt (12 pces)', description: 'Selecció del dia', price: 28, image: 'https://images.unsplash.com/photo-1535007813616-4a1db0712dfd?w=600&h=400&fit=crop', allergens: ['fish'] },
        { name: 'Temaki de tonyina picant', description: 'Amb sriracha mayo i daikon', price: 12, image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600&h=400&fit=crop', allergens: ['fish', 'soy'] },
        { name: 'Tataki de tonyina', description: 'Amb salsa ponzu i sèsam', price: 18, image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop', allergens: ['fish', 'sesame', 'soy'] },
      ]},
      { name: 'Rolls especials', sortOrder: 1, items: [
        { name: 'Dragon Roll', description: 'Tempura de gamba, alvocat, anguila i sèsam', price: 18, image: 'https://images.unsplash.com/photo-1617196034183-421b4917c92d?w=600&h=400&fit=crop', allergens: ['crustaceans', 'sesame', 'gluten'], isPopular: true },
        { name: 'Volcano Roll', description: 'Salmó flamejat, formatge crema i salsa kimchi', price: 16, image: 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=600&h=400&fit=crop', allergens: ['fish', 'dairy'] },
        { name: 'Rainbow Roll', description: 'Assortiment de peix fresc sobre California roll', price: 20, image: 'https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=600&h=400&fit=crop', allergens: ['fish', 'crustaceans'] },
      ]},
      { name: 'Plats calents', sortOrder: 2, items: [
        { name: 'Ramen Tonkotsu', description: 'Brou 12h, ou marinat, chashu, negi', price: 16, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop', allergens: ['gluten', 'eggs', 'soy'] },
        { name: 'Gyozas de gamba (6 pces)', description: 'A la planxa amb salsa ponzu', price: 11, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&h=400&fit=crop', allergens: ['crustaceans', 'gluten', 'soy'] },
        { name: 'Edamame trufa', description: 'Amb oli de tòfona i sal Maldon', price: 8, image: 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?w=600&h=400&fit=crop', allergens: ['soy'] },
      ]},
      { name: 'Postres', sortOrder: 3, items: [
        { name: 'Mochi gelat (3 pces)', description: 'Matcha, maduixa, mango', price: 9, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop', allergens: ['dairy'] },
        { name: 'Cheesecake japonès', description: 'Suau i esponjós, amb coulis de maracujà', price: 10, image: 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=600&h=400&fit=crop', allergens: ['dairy', 'eggs', 'gluten'] },
      ]},
    ],
    offers: [
      { title: 'Omakase -25%', description: 'Menú omakase del xef amb descompte', type: 'PERCENTAGE', value: 25, daysOfWeek: [1, 2, 3], startTime: '13:00', endTime: '15:30' },
      { title: 'Menú degustació', description: '12 nigiris + 2 rolls + sashimi + postre', type: 'SPECIAL_MENU', value: 55 },
    ],
  },
  {
    name: 'La Trattoria',
    slug: 'la-trattoria',
    description: 'Authentic Neapolitan pizza from a 480°C wood-fired oven, handmade tagliatelle and fresh tiramisù. Cozy candlelit interior.',
    cuisineType: ['pizza_pasta', 'mediterranean'], priceRange: 2,
    phone: '+376 845 678', email: 'ciao@latrattoria.ad', website: 'https://latrattoria.ad',
    address: 'Carrer Major, 12, Escaldes-Engordany', parish: 'ESCALDES_ENGORDANY',
    latitude: 42.5092, longitude: 1.5349, isActive: true, isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop'],
    avgRating: 4.4, reviewCount: 456,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:30', isClosed: true },
      ...([2, 3, 4].map((d) => ({ dayOfWeek: d, openTime: '12:00', closeTime: '22:30', isClosed: false }))),
      { dayOfWeek: 5, openTime: '12:00', closeTime: '23:30', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '23:30', isClosed: false },
    ],
    zones: [
      { name: 'Interior', tables: [
        { label: 'T1', minCovers: 2, maxCovers: 4 }, { label: 'T2', minCovers: 2, maxCovers: 4 },
        { label: 'T3', minCovers: 2, maxCovers: 6 }, { label: 'T4', minCovers: 2, maxCovers: 4 },
        { label: 'T5', minCovers: 4, maxCovers: 10 },
      ]},
      { name: 'Terrassa', tables: [
        { label: 'E1', minCovers: 2, maxCovers: 4 }, { label: 'E2', minCovers: 2, maxCovers: 4 },
        { label: 'E3', minCovers: 2, maxCovers: 4 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '12:00', endTime: '15:30', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 2, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '19:30', endTime: '22:30', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Pizzes', sortOrder: 0, items: [
        { name: 'Margherita DOP', description: 'Mozzarella di bufala, tomàquet San Marzano, alfàbrega', price: 14, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'], isPopular: true },
        { name: 'Diavola', description: 'Salami picant, mozzarella, xili', price: 16, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'] },
        { name: 'Tartufo', description: 'Crema de tòfona, funghi, burrata', price: 19, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'], isPopular: true },
        { name: 'Quattro Formaggi', description: 'Mozzarella, gorgonzola, parmesà, fontina', price: 17, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'] },
      ]},
      { name: 'Pasta', sortOrder: 1, items: [
        { name: 'Tagliatelle al ragù', description: 'Pasta fresca amb ragú bolonyès 6h', price: 16, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=400&fit=crop', allergens: ['gluten', 'eggs', 'dairy'] },
        { name: 'Cacio e Pepe', description: 'Tonnarelli, pecorino romano, pebre negre', price: 15, image: 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'], isPopular: true },
        { name: 'Ravioli de ricotta i espinacs', description: 'Amb mantega de sàlvia i parmesà', price: 17, image: 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy', 'eggs'] },
      ]},
      { name: 'Dolci', sortOrder: 2, items: [
        { name: 'Tiramisù', description: 'Recepta clàssica amb mascarpone i cafè', price: 9, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop', allergens: ['eggs', 'dairy', 'gluten'], isPopular: true },
        { name: 'Panna Cotta', description: 'Amb coulis de fruits vermells', price: 8, image: 'https://images.unsplash.com/photo-1486427944544-d2c246c4df14?w=600&h=400&fit=crop', allergens: ['dairy'] },
      ]},
    ],
    offers: [
      { title: '2x1 en pizzes', description: 'Dimarts i dimecres a sopar', type: 'FREE_ITEM', value: 1, daysOfWeek: [2, 3], startTime: '19:30', endTime: '22:30' },
      { title: '-10% take away', description: 'En comandes per emportar', type: 'PERCENTAGE', value: 10 },
    ],
  },
  {
    name: 'The Burger Lab', slug: 'the-burger-lab',
    description: 'Gourmet smash burgers, truffle fries and 18 craft beers on tap. Neon-lit industrial interior.',
    cuisineType: ['burgers'], priceRange: 2,
    phone: '+376 823 456', email: 'eat@burgerlab.ad', website: 'https://burgerlab.ad',
    address: 'Avinguda Carlemany, 45, Escaldes-Engordany', parish: 'ESCALDES_ENGORDANY',
    latitude: 42.5100, longitude: 1.5365, isActive: true, isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=600&fit=crop'],
    avgRating: 4.2, reviewCount: 389,
    hours: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, openTime: '12:00', closeTime: i >= 5 ? '00:00' : '23:00', isClosed: false })),
    zones: [
      { name: 'Sala', tables: [
        { label: 'B1', minCovers: 1, maxCovers: 2 }, { label: 'B2', minCovers: 1, maxCovers: 2 },
        { label: 'B3', minCovers: 2, maxCovers: 4 }, { label: 'B4', minCovers: 2, maxCovers: 4 },
        { label: 'B5', minCovers: 2, maxCovers: 4 }, { label: 'B6', minCovers: 4, maxCovers: 6 },
      ]},
    ],
    services: [
      { name: 'Servei continu', startTime: '12:00', endTime: '23:00', slotInterval: 30, turnDuration: 60, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Burgers', sortOrder: 0, items: [
        { name: 'Classic Smash', description: 'Doble smash, cheddar, ceba caramelitzada, pickle', price: 14, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'], isPopular: true },
        { name: 'Truffle Burger', description: 'Angus, brie, bolets, maionesa de tòfona', price: 18, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy', 'eggs'], isPopular: true },
        { name: 'BBQ Bacon', description: 'Bacon cruixent, cheddar, ceba fregida, salsa BBQ', price: 16, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'] },
        { name: 'Veggie Lab', description: 'Hamburguesa Beyond Meat, aguacate, rúcula', price: 15, image: 'https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=600&h=400&fit=crop', allergens: ['gluten', 'soy'] },
      ]},
      { name: 'Sides', sortOrder: 1, items: [
        { name: 'Truffle Fries', description: 'Patates amb oli de tòfona i parmesà', price: 8, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=400&fit=crop', allergens: ['dairy'], isPopular: true },
        { name: 'Onion Rings', description: 'Amb salsa ranch casolana', price: 7, image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=400&fit=crop', allergens: ['gluten', 'eggs'] },
        { name: 'Mac & Cheese Bites', description: '6 unitats amb salsa chipotle', price: 9, image: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'] },
      ]},
      { name: 'Shakes & Postres', sortOrder: 2, items: [
        { name: 'Milkshake Oreo', description: 'Gelat de vainilla, Oreo, nata', price: 7, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&h=400&fit=crop', allergens: ['dairy', 'gluten'] },
        { name: 'Brownie & gelat', description: 'Brownie calent amb gelat de vainilla i xocolata', price: 8, image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy', 'eggs'] },
      ]},
    ],
    offers: [
      { title: 'Menú Burger', description: 'Burger + patates + beguda', type: 'SPECIAL_MENU', value: 16.9, daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '12:00', endTime: '16:00' },
      { title: 'Happy Hour -20%', description: 'De 12 a 14h de dilluns a divendres', type: 'PERCENTAGE', value: 20, daysOfWeek: [1, 2, 3, 4, 5], startTime: '12:00', endTime: '14:00' },
    ],
  },
  {
    name: 'Verdana', slug: 'verdana',
    description: 'Plant-forward bowls, açaí smoothies and guilt-free weekend brunch. Bright space with living walls.',
    cuisineType: ['healthy', 'brunch'], priceRange: 2,
    phone: '+376 856 789', email: 'hola@verdana.ad', website: 'https://verdana.ad',
    address: 'Plaça Coprínceps, 3, Andorra la Vella', parish: 'ANDORRA_LA_VELLA',
    latitude: 42.5068, longitude: 1.5225, isActive: true, isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop'],
    avgRating: 4.5, reviewCount: 198,
    hours: [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: true },
      ...([2, 3, 4].map((d) => ({ dayOfWeek: d, openTime: '09:00', closeTime: '17:00', isClosed: false }))),
      { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00', isClosed: false },
    ],
    zones: [
      { name: 'Interior', tables: [
        { label: 'V1', minCovers: 1, maxCovers: 2 }, { label: 'V2', minCovers: 1, maxCovers: 2 },
        { label: 'V3', minCovers: 2, maxCovers: 4 }, { label: 'V4', minCovers: 2, maxCovers: 4 },
      ]},
      { name: 'Terrassa', tables: [
        { label: 'TE1', minCovers: 2, maxCovers: 4 }, { label: 'TE2', minCovers: 2, maxCovers: 4 },
        { label: 'TE3', minCovers: 2, maxCovers: 6 },
      ]},
    ],
    services: [
      { name: 'Brunch', startTime: '09:00', endTime: '12:00', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 2, 3, 4, 5, 6] },
      { name: 'Dinar', startTime: '12:30', endTime: '16:30', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Brunch', sortOrder: 0, items: [
        { name: 'Açaí Bowl', description: 'Açaí, plàtan, granola, coco i fruits del bosc', price: 12, image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop', allergens: ['nuts'], isPopular: true },
        { name: 'Avocado Toast', description: 'Pa de massa mare, alvocat, ou poché, llavors', price: 13, image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&h=400&fit=crop', allergens: ['gluten', 'eggs'], isPopular: true },
        { name: 'Pancakes de platàtan', description: 'Amb mel, fruits del bosc i yogurt grec', price: 11, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop', allergens: ['eggs', 'dairy', 'gluten'] },
      ]},
      { name: 'Bowls', sortOrder: 1, items: [
        { name: 'Poke Bowl salmó', description: 'Arròs, salmó fresc, alvocat, edamame, sèsam', price: 15, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop', allergens: ['fish', 'soy', 'sesame'] },
        { name: 'Buddha Bowl', description: 'Quinoa, hummus, falafel, verdures rostides, tahina', price: 14, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop', allergens: ['sesame'] },
        { name: 'Power Bowl', description: 'Pollastre grillat, bròquil, boniato, kale, salsa chimichurri', price: 15, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop' },
      ]},
      { name: 'Smoothies', sortOrder: 2, items: [
        { name: 'Green Detox', description: 'Espinacs, poma, gingebre, llimona, matcha', price: 7, image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&h=400&fit=crop', isPopular: true },
        { name: 'Tropical Boost', description: 'Mango, maracujà, plàtan, llet de coco', price: 7, image: 'https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=600&h=400&fit=crop' },
      ]},
    ],
    offers: [
      { title: 'Brunch complet', description: 'Plat + bowl + smoothie', type: 'SPECIAL_MENU', value: 22, daysOfWeek: [0, 5, 6], startTime: '09:00', endTime: '12:00' },
      { title: '-10% estudiants', description: 'Amb carnet d\'estudiant', type: 'PERCENTAGE', value: 10 },
    ],
  },
  {
    name: 'El Celler', slug: 'el-celler',
    description: 'Seasonal 7-course tasting menus with wine pairing in a restored 16th-century cellar. Michelin-recommended. Limited to 24 covers.',
    cuisineType: ['fine_dining', 'mediterranean'], priceRange: 4,
    phone: '+376 878 901', email: 'reservations@elceller.ad', website: 'https://elceller.ad',
    address: 'Carrer Prat de la Creu, 8, Andorra la Vella', parish: 'ANDORRA_LA_VELLA',
    latitude: 42.5058, longitude: 1.5210, isActive: true, isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop'],
    avgRating: 4.9, reviewCount: 142,
    hours: [
      { dayOfWeek: 0, openTime: '19:00', closeTime: '23:00', isClosed: true },
      { dayOfWeek: 1, openTime: '19:00', closeTime: '23:00', isClosed: true },
      ...([2, 3, 4].map((d) => ({ dayOfWeek: d, openTime: '19:00', closeTime: '23:00', isClosed: false }))),
      { dayOfWeek: 5, openTime: '19:00', closeTime: '00:00', isClosed: false },
      { dayOfWeek: 6, openTime: '19:00', closeTime: '00:00', isClosed: false },
    ],
    zones: [
      { name: 'Celler', tables: [
        { label: 'C1', minCovers: 2, maxCovers: 2 }, { label: 'C2', minCovers: 2, maxCovers: 2 },
        { label: 'C3', minCovers: 2, maxCovers: 4 }, { label: 'C4', minCovers: 2, maxCovers: 4 },
        { label: 'C5', minCovers: 4, maxCovers: 6 },
      ]},
      { name: 'Saló privat', tables: [
        { label: 'P1', minCovers: 6, maxCovers: 12 },
      ]},
    ],
    services: [
      { name: 'Sopar', startTime: '19:30', endTime: '22:00', slotInterval: 30, turnDuration: 150, daysOfWeek: [2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Menú Degustació (7 plats)', sortOrder: 0, items: [
        { name: 'Esfera de bolets', description: 'Consomé de ceps amb gel de tòfona negra', price: 0, image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop', isPopular: true },
        { name: 'Vieira amb coliflor', description: 'Vieira marcada, puré de coliflor i caviar', price: 0, image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop', allergens: ['molluscs', 'dairy'] },
        { name: 'Ravioli de gamba', description: 'Pasta fresca farcida, brou de caps i all negre', price: 0, image: 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=600&h=400&fit=crop', allergens: ['crustaceans', 'gluten', 'eggs'] },
        { name: 'Xai lactat', description: 'Costella de xai, puré de pastanaga i jus', price: 0, image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&h=400&fit=crop' },
        { name: 'Pre-postre de cítrics', description: 'Sorbet de llimona, gel de yuzu, menta fresca', price: 0, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop' },
      ]},
      { name: 'Carta de vins', sortOrder: 1, items: [
        { name: 'Copa de cava brut nature', price: 8, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop' },
        { name: 'Maridatge de vins (5 copes)', description: 'Selecció del sommelier per acompanyar el menú', price: 45, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop', isPopular: true },
      ]},
    ],
    offers: [
      { title: 'Menú degustació', description: '7 plats + pre-postre + petit fours', type: 'SPECIAL_MENU', value: 95 },
      { title: 'Menú + maridatge', description: 'Menú degustació + maridatge de vins', type: 'SPECIAL_MENU', value: 130 },
    ],
  },
  {
    name: 'Mar Blau', slug: 'mar-blau',
    description: 'Freshest Atlantic seafood in the Pyrenees. Whole grilled turbot, lobster rice and daily oyster selection.',
    cuisineType: ['seafood', 'mediterranean'], priceRange: 3,
    phone: '+376 861 234', email: 'reservas@marblau.ad', website: 'https://marblau.ad',
    address: 'Carrer dels Escalls, 7, La Massana', parish: 'LA_MASSANA',
    latitude: 42.5400, longitude: 1.5148, isActive: true, isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800&h=600&fit=crop'],
    avgRating: 4.5, reviewCount: 163,
    hours: [
      { dayOfWeek: 0, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 1, openTime: '13:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 2, openTime: '13:00', closeTime: '22:00', isClosed: true },
      ...([3, 4].map((d) => ({ dayOfWeek: d, openTime: '13:00', closeTime: '22:00', isClosed: false }))),
      { dayOfWeek: 5, openTime: '13:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 6, openTime: '13:00', closeTime: '23:00', isClosed: false },
    ],
    zones: [
      { name: 'Sala', tables: [
        { label: 'M1', minCovers: 2, maxCovers: 4 }, { label: 'M2', minCovers: 2, maxCovers: 4 },
        { label: 'M3', minCovers: 2, maxCovers: 6 }, { label: 'M4', minCovers: 4, maxCovers: 8 },
      ]},
      { name: 'Terrassa', tables: [
        { label: 'TE1', minCovers: 2, maxCovers: 4 }, { label: 'TE2', minCovers: 2, maxCovers: 4 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '13:00', endTime: '16:00', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '20:00', endTime: '22:00', slotInterval: 30, turnDuration: 120, daysOfWeek: [0, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Entrants de mar', sortOrder: 0, items: [
        { name: 'Ostres (6 pces)', description: 'Ostres fresques del dia amb llimona i mignonette', price: 24, image: 'https://images.unsplash.com/photo-1606731219412-3bbdb3e6dbcb?w=600&h=400&fit=crop', allergens: ['molluscs'], isPopular: true },
        { name: 'Carpaccio de pop', description: 'Amb oli d\'oliva, pebre vermell i cebollí', price: 16, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop', allergens: ['molluscs'] },
        { name: 'Gambes a la planxa', description: 'Gambes vermelles de Palamós amb sal gruixuda', price: 22, image: 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=600&h=400&fit=crop', allergens: ['crustaceans'], isPopular: true },
      ]},
      { name: 'Principals', sortOrder: 1, items: [
        { name: 'Arròs de llagostins', description: 'Arròs caldós amb llagostins i fumé de peix', price: 28, image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=600&h=400&fit=crop', allergens: ['crustaceans'], isPopular: true },
        { name: 'Lluç a la brasa', description: 'Amb patates confitades i pil-pil', price: 26, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop', allergens: ['fish'] },
        { name: 'Turbot sencer', description: 'A la brasa amb verdures (2 pers.)', price: 58, image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&h=400&fit=crop', allergens: ['fish'] },
      ]},
      { name: 'Postres', sortOrder: 2, items: [
        { name: 'Pastís de llimona', description: 'Merengue flamejat i gel de gingebre', price: 9, image: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=600&h=400&fit=crop', allergens: ['eggs', 'dairy', 'gluten'] },
      ]},
    ],
    offers: [
      { title: '-20% dinar', description: 'Dijous i divendres al migdia', type: 'PERCENTAGE', value: 20, daysOfWeek: [4, 5], startTime: '13:00', endTime: '16:00' },
      { title: 'Mariscada per 2', description: 'Selecció de marisc + arròs + vi blanc', type: 'SPECIAL_MENU', value: 75, daysOfWeek: [5, 6] },
    ],
  },
  {
    name: 'La Cantina', slug: 'la-cantina',
    description: 'Vibrant Mexican flavours. Handmade corn tortillas, 48-hour carnitas and 60+ mezcals. Live mariachi Fridays.',
    cuisineType: ['mexican', 'tapas'], priceRange: 2,
    phone: '+376 831 567', email: 'hola@lacantina.ad', website: 'https://lacantina.ad',
    address: 'Plaça dels Arinsal, 2, Encamp', parish: 'ENCAMP',
    latitude: 42.5340, longitude: 1.5805, isActive: true, isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&h=600&fit=crop'],
    avgRating: 4.3, reviewCount: 276,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '22:30', isClosed: true },
      ...([3, 4].map((d) => ({ dayOfWeek: d, openTime: '12:00', closeTime: '22:30', isClosed: false }))),
      { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isClosed: false },
    ],
    zones: [
      { name: 'Interior', tables: [
        { label: 'C1', minCovers: 2, maxCovers: 4 }, { label: 'C2', minCovers: 2, maxCovers: 4 },
        { label: 'C3', minCovers: 2, maxCovers: 6 }, { label: 'C4', minCovers: 4, maxCovers: 8 },
        { label: 'C5', minCovers: 1, maxCovers: 2 }, { label: 'C6', minCovers: 1, maxCovers: 2 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '12:00', endTime: '16:00', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 1, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '19:30', endTime: '22:30', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 1, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Tacos', sortOrder: 0, items: [
        { name: 'Tacos al Pastor (3)', description: 'Porc marinat, pinya, coriandre, ceba', price: 12, image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop', allergens: ['gluten'], isPopular: true },
        { name: 'Tacos de Carnitas (3)', description: 'Porc confitat 48h, salsa verde, guacamole', price: 13, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop', allergens: ['gluten'] },
        { name: 'Tacos de Gambas (3)', description: 'Gambes tempura, slaw de col, chipotle mayo', price: 14, image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=600&h=400&fit=crop', allergens: ['gluten', 'crustaceans'] },
      ]},
      { name: 'Plats principals', sortOrder: 1, items: [
        { name: 'Burrito Monster', description: 'Pollastre, arròs, frijoles, guacamole, pico de gallo', price: 15, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'], isPopular: true },
        { name: 'Quesadilla de Birria', description: 'Formatge fos, vedella estofada, consomé per mullar', price: 16, image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'] },
        { name: 'Nachos Supreme', description: 'Chips de blat de moro, chili con carne, jalapeños, formatge', price: 14, image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&h=400&fit=crop', allergens: ['dairy'] },
      ]},
      { name: 'Postres & Begudes', sortOrder: 2, items: [
        { name: 'Churros amb xocolata', description: 'Amb sucre i canyella, xocolata calenta', price: 8, image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy'] },
        { name: 'Margarita clàssica', description: 'Tequila, triple sec, llimona fresca', price: 10, image: 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=600&h=400&fit=crop' },
      ]},
    ],
    offers: [
      { title: 'Taco Tuesday', description: 'Tots els tacos a 3€/unitat', type: 'FIXED_AMOUNT', value: 3, daysOfWeek: [2] },
      { title: 'Margarita Happy Hour', description: 'Margarites a meitat de preu de 18h a 20h', type: 'PERCENTAGE', value: 50, daysOfWeek: [4, 5, 6], startTime: '18:00', endTime: '20:00' },
    ],
  },
  {
    name: 'Noodle House', slug: 'noodle-house',
    description: 'Steaming ramen, hand-pulled udon, crispy gyoza and bao buns. Vegetarian & vegan options throughout.',
    cuisineType: ['asian', 'healthy'], priceRange: 2,
    phone: '+376 872 890', email: 'info@noodlehouse.ad', website: 'https://noodlehouse.ad',
    address: 'Avinguda de Sant Joan de Caselles, 15, Canillo', parish: 'CANILLO',
    latitude: 42.5672, longitude: 1.5988, isActive: true, isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&h=600&fit=crop'],
    avgRating: 4.4, reviewCount: 201,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:00', isClosed: true },
      ...([2, 3, 4].map((d) => ({ dayOfWeek: d, openTime: '12:00', closeTime: '22:00', isClosed: false }))),
      { dayOfWeek: 5, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '23:00', isClosed: false },
    ],
    zones: [
      { name: 'Barra', tables: [
        { label: 'B1', minCovers: 1, maxCovers: 1 }, { label: 'B2', minCovers: 1, maxCovers: 1 },
        { label: 'B3', minCovers: 1, maxCovers: 2 }, { label: 'B4', minCovers: 1, maxCovers: 2 },
      ]},
      { name: 'Sala', tables: [
        { label: 'S1', minCovers: 2, maxCovers: 4 }, { label: 'S2', minCovers: 2, maxCovers: 4 },
        { label: 'S3', minCovers: 2, maxCovers: 4 }, { label: 'S4', minCovers: 4, maxCovers: 6 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '12:00', endTime: '15:30', slotInterval: 30, turnDuration: 60, daysOfWeek: [0, 2, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '19:00', endTime: '22:00', slotInterval: 30, turnDuration: 60, daysOfWeek: [0, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Ramen', sortOrder: 0, items: [
        { name: 'Tonkotsu Ramen', description: 'Brou de porc 12h, chashu, ou marinat, negi', price: 15, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop', allergens: ['gluten', 'eggs', 'soy'], isPopular: true },
        { name: 'Miso Ramen', description: 'Brou de miso, porc desfilat, blat de moro, mantega', price: 14, image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600&h=400&fit=crop', allergens: ['gluten', 'soy', 'dairy'] },
        { name: 'Veggie Ramen', description: 'Brou de kombu i shiitake, tofu, verdures', price: 13, image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&h=400&fit=crop', allergens: ['soy', 'gluten'] },
      ]},
      { name: 'Petits plats', sortOrder: 1, items: [
        { name: 'Gyozas (6 pces)', description: 'Porc i col xinesa, salsa ponzu', price: 9, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&h=400&fit=crop', allergens: ['gluten', 'soy'], isPopular: true },
        { name: 'Bao buns (2)', description: 'Porc braseig, hoisin, pepinets', price: 10, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&h=400&fit=crop', allergens: ['gluten', 'soy'] },
        { name: 'Karaage de pollastre', description: 'Pollastre fregit japonès amb maionesa de yuzu', price: 11, image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&h=400&fit=crop', allergens: ['gluten', 'eggs'] },
      ]},
      { name: 'Udon & arrossos', sortOrder: 2, items: [
        { name: 'Yaki Udon', description: 'Fideus gruixuts saltejats amb verdures i salsa teriyaki', price: 13, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=600&h=400&fit=crop', allergens: ['gluten', 'soy'] },
        { name: 'Curry Katsu', description: 'Pollastre empanat amb curry japonès i arròs', price: 14, image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=400&fit=crop', allergens: ['gluten', 'eggs'] },
      ]},
    ],
    offers: [
      { title: 'Ramen + gyozas', description: 'Qualsevol ramen + gyozas per 19€', type: 'SPECIAL_MENU', value: 19 },
      { title: '-15% take away', description: 'En comandes per emportar', type: 'PERCENTAGE', value: 15 },
    ],
  },
  {
    name: 'Brasa & Mar', slug: 'brasa-i-mar',
    description: 'Premium dry-aged steaks and whole grilled fish over charcoal. Signature bone-in ribeye and Somontano wines.',
    cuisineType: ['steakhouse', 'seafood'], priceRange: 3,
    phone: '+376 844 321', email: 'book@brasaimar.ad', website: 'https://brasaimar.ad',
    address: "Avinguda Verge de Canòlich, 30, Sant Julià de Lòria", parish: 'SANT_JULIA_DE_LORIA',
    latitude: 42.4636, longitude: 1.4910, isActive: true, isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
    images: ['https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=600&fit=crop'],
    avgRating: 4.6, reviewCount: 134,
    hours: [
      { dayOfWeek: 0, openTime: '12:30', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 1, openTime: '12:30', closeTime: '22:30', isClosed: true },
      ...([2, 3, 4].map((d) => ({ dayOfWeek: d, openTime: '12:30', closeTime: '22:30', isClosed: false }))),
      { dayOfWeek: 5, openTime: '12:30', closeTime: '23:30', isClosed: false },
      { dayOfWeek: 6, openTime: '12:30', closeTime: '23:30', isClosed: false },
    ],
    zones: [
      { name: 'Interior', tables: [
        { label: 'G1', minCovers: 2, maxCovers: 4 }, { label: 'G2', minCovers: 2, maxCovers: 4 },
        { label: 'G3', minCovers: 2, maxCovers: 6 }, { label: 'G4', minCovers: 4, maxCovers: 8 },
      ]},
      { name: 'Terrassa', tables: [
        { label: 'TE1', minCovers: 2, maxCovers: 4 }, { label: 'TE2', minCovers: 2, maxCovers: 4 },
        { label: 'TE3', minCovers: 2, maxCovers: 6 },
      ]},
    ],
    services: [
      { name: 'Dinar', startTime: '12:30', endTime: '16:00', slotInterval: 30, turnDuration: 90, daysOfWeek: [0, 2, 3, 4, 5, 6] },
      { name: 'Sopar', startTime: '20:00', endTime: '22:30', slotInterval: 30, turnDuration: 120, daysOfWeek: [0, 2, 3, 4, 5, 6] },
    ],
    menu: [
      { name: 'Entrants', sortOrder: 0, items: [
        { name: 'Steak Tartare', description: 'Vedella tallada a ganivet, ou de guatlla, croutons', price: 18, image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&h=400&fit=crop', allergens: ['eggs', 'gluten'], isPopular: true },
        { name: 'Espardenyes a la planxa', description: 'Amb pernil ibèric i oli d\'oliva', price: 24, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop', allergens: ['molluscs'] },
        { name: 'Amanida de tomàquet', description: 'Tomàquet de temporada, burrata, alfàbrega i AOVE', price: 14, image: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=600&h=400&fit=crop', allergens: ['dairy'] },
      ]},
      { name: 'Carns a la brasa', sortOrder: 1, items: [
        { name: 'Dry-aged Ribeye (400g)', description: 'Madurada 60 dies, amb sal de carbó', price: 42, image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop', isPopular: true },
        { name: 'Tomahawk (1.2kg)', description: 'Per compartir, amb guarnició de temporada', price: 85, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop', isPopular: true },
        { name: 'Secreto ibèric', description: 'Amb patates sufflé i salsa de pebre verd', price: 26, image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&h=400&fit=crop' },
      ]},
      { name: 'Peixos', sortOrder: 2, items: [
        { name: 'Llobarro a la brasa', description: 'Sencer, amb verdures al vapor', price: 28, image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&h=400&fit=crop', allergens: ['fish'] },
        { name: 'Gamba vermella', description: 'A la sal, amb allioli suau', price: 32, image: 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=600&h=400&fit=crop', allergens: ['crustaceans'] },
      ]},
      { name: 'Postres', sortOrder: 3, items: [
        { name: 'Coulant de xocolata', description: 'Amb gelat de vainilla i caramel salat', price: 10, image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&h=400&fit=crop', allergens: ['gluten', 'dairy', 'eggs'], isPopular: true },
        { name: 'Formatge artesà', description: 'Selecció de 3 formatges andorrans amb fruits secs', price: 12, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600&h=400&fit=crop', allergens: ['dairy', 'nuts'] },
      ]},
    ],
    offers: [
      { title: '-15% dinar', description: 'De dimarts a divendres al migdia', type: 'PERCENTAGE', value: 15, daysOfWeek: [2, 3, 4, 5], startTime: '12:30', endTime: '16:00' },
      { title: 'Menú brasa premium', description: 'Entrant + carn/peix + postre + copa de vi', type: 'SPECIAL_MENU', value: 48, daysOfWeek: [5, 6] },
    ],
  },
];

const main = async () => {
  console.log('Seeding database...\n');

  for (const restaurantData of RESTAURANTS_SEED) {
    const { hours, zones, services, menu, offers, ...data } = restaurantData;

    const restaurant = await prisma.restaurant.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        description: data.description,
        cuisineType: data.cuisineType,
        priceRange: data.priceRange,
        phone: data.phone,
        email: data.email,
        website: data.website,
        address: data.address,
        coverImage: data.coverImage,
        images: data.images,
        avgRating: data.avgRating,
        reviewCount: data.reviewCount,
        isFeatured: data.isFeatured,
      },
      create: data,
    });

    for (const hour of hours) {
      await prisma.openingHours.upsert({
        where: {
          restaurantId_dayOfWeek: {
            restaurantId: restaurant.id,
            dayOfWeek: hour.dayOfWeek,
          },
        },
        update: { openTime: hour.openTime, closeTime: hour.closeTime, isClosed: hour.isClosed },
        create: { restaurantId: restaurant.id, ...hour },
      });
    }

    const existingZones = await prisma.zone.findMany({ where: { restaurantId: restaurant.id } });
    if (existingZones.length === 0) {
      for (let zi = 0; zi < zones.length; zi++) {
        const zoneSeed = zones[zi];
        const zone = await prisma.zone.create({
          data: {
            restaurantId: restaurant.id,
            name: zoneSeed.name,
            sortOrder: zi,
          },
        });

        for (const tableSeed of zoneSeed.tables) {
          await prisma.restaurantTable.create({
            data: {
              restaurantId: restaurant.id,
              zoneId: zone.id,
              label: tableSeed.label,
              minCovers: tableSeed.minCovers,
              maxCovers: tableSeed.maxCovers,
            },
          });
        }
      }
    }

    const existingServices = await prisma.service.findMany({ where: { restaurantId: restaurant.id } });
    if (existingServices.length === 0) {
      for (const svcSeed of services) {
        await prisma.service.create({
          data: {
            restaurantId: restaurant.id,
            name: svcSeed.name,
            startTime: svcSeed.startTime,
            endTime: svcSeed.endTime,
            slotInterval: svcSeed.slotInterval,
            turnDuration: svcSeed.turnDuration,
            daysOfWeek: svcSeed.daysOfWeek,
          },
        });
      }
    }

    const ownerEmail = `owner@${data.slug}.taula.ad`;
    await prisma.restaurantOwner.upsert({
      where: { email: ownerEmail },
      update: {},
      create: {
        restaurantId: restaurant.id,
        email: ownerEmail,
        name: `Owner ${data.name}`,
        passwordHash: await bcrypt.hash('password123', 12),
      },
    });

    // ── MENU (replace to ensure images are seeded) ──
    if (menu) {
      await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
      await prisma.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });
    }
    if (menu) {
      for (const cat of menu) {
        const category = await prisma.menuCategory.create({
          data: { restaurantId: restaurant.id, name: cat.name, sortOrder: cat.sortOrder ?? 0 },
        });
        for (const item of cat.items) {
          await prisma.menuItem.create({
            data: {
              restaurantId: restaurant.id,
              categoryId: category.id,
              name: item.name,
              description: item.description ?? null,
              price: item.price,
              image: item.image ?? null,
              allergens: item.allergens ?? [],
              isPopular: item.isPopular ?? false,
              sortOrder: item.sortOrder ?? 0,
            },
          });
        }
      }
    }

    // ── OFFERS (replace to ensure new data) ──
    if (offers) {
      await prisma.offer.deleteMany({ where: { restaurantId: restaurant.id } });
    }
    if (offers) {
      for (const offer of offers) {
        await prisma.offer.create({
          data: {
            restaurantId: restaurant.id,
            title: offer.title,
            description: offer.description ?? null,
            type: offer.type as any,
            value: offer.value,
            daysOfWeek: offer.daysOfWeek ?? [],
            startTime: offer.startTime ?? null,
            endTime: offer.endTime ?? null,
            isActive: true,
          },
        });
      }
    }

    console.log(`  OK ${restaurant.name} (${data.parish})`);
  }

  await prisma.user.upsert({
    where: { email: 'test@taula.ad' },
    update: {},
    create: {
      email: 'test@taula.ad',
      name: 'Usuario Test',
      passwordHash: await bcrypt.hash('password123', 12),
      authProvider: 'email',
      preferredLang: 'ca',
    },
  });

  console.log('\n  Seed completado!');
  console.log('\n  Usuario test: test@taula.ad / password123');
  console.log('  Panel restaurante: owner@borda-jovell.taula.ad / password123');
};

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
