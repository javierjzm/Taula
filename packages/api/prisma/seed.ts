import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SlotService } from '../src/services/slot.service';

const prisma = new PrismaClient();

const WEEK_STANDARD = (open: string, close: string, closedDay?: number) =>
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: open,
    closeTime: i >= 5 ? close.replace(':00', ':30') : close,
    isClosed: i === closedDay,
  }));

const RESTAURANTS_SEED = [
  // ───────────────────────── 1. BORDA JOVELL ─────────────────────────
  {
    name: 'Borda Jovell',
    slug: 'borda-jovell',
    description:
      'Traditional mountain cuisine in a 17th-century stone borda. Grilled meats over open flame, local cheeses, and panoramic valley views. A must-visit for an authentic Pyrenean dining experience.',
    cuisineType: ['steakhouse', 'fine_dining'],
    priceRange: 3,
    phone: '+376 835 151',
    email: 'reservas@bordajovell.ad',
    website: 'https://bordajovell.ad',
    address: "Ctra. de l'Obac, s/n, Ordino",
    parish: 'ORDINO' as const,
    latitude: 42.5558,
    longitude: 1.5330,
    isActive: true,
    isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
    ],
    avgRating: 4.6,
    reviewCount: 187,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 3, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '23:00', isClosed: false },
    ],
  },

  // ───────────────────────── 2. CAN MANEL ─────────────────────────
  {
    name: 'Restaurant Can Manel',
    slug: 'can-manel',
    description:
      'Family-run since 1982. Market-fresh Mediterranean sharing plates, homemade desserts and a carefully curated selection of Catalan and local wines.',
    cuisineType: ['mediterranean', 'tapas'],
    priceRange: 2,
    phone: '+376 869 264',
    email: 'info@canmanel.ad',
    website: 'https://canmanel.ad',
    address: 'Carrer de la Vall, 25, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA' as const,
    latitude: 42.5063,
    longitude: 1.5218,
    isActive: true,
    isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop',
    ],
    avgRating: 4.3,
    reviewCount: 312,
    hours: [
      { dayOfWeek: 0, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 1, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 2, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 3, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '13:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 6, openTime: '13:00', closeTime: '22:00', isClosed: false },
    ],
  },

  // ───────────────────────── 3. KOI SUSHI ─────────────────────────
  {
    name: 'Koi Sushi Andorra',
    slug: 'koi-sushi-andorra',
    description:
      'Premium omakase and creative maki rolls with fish flown in daily from Tsukiji. Minimalist interior, open kitchen, and a sakè menu with over 30 labels.',
    cuisineType: ['sushi', 'asian'],
    priceRange: 3,
    phone: '+376 812 345',
    email: 'hello@koisushi.ad',
    website: 'https://koisushi.ad',
    address: 'Avinguda Meritxell, 89, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA' as const,
    latitude: 42.5075,
    longitude: 1.5280,
    isActive: true,
    isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&h=600&fit=crop',
    ],
    avgRating: 4.7,
    reviewCount: 224,
    hours: [
      { dayOfWeek: 0, openTime: '13:00', closeTime: '23:00', isClosed: true },
      { dayOfWeek: 1, openTime: '13:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 2, openTime: '13:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 3, openTime: '13:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 4, openTime: '13:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 5, openTime: '13:00', closeTime: '00:00', isClosed: false },
      { dayOfWeek: 6, openTime: '13:00', closeTime: '00:00', isClosed: false },
    ],
  },

  // ───────────────────────── 4. LA TRATTORIA ─────────────────────────
  {
    name: 'La Trattoria',
    slug: 'la-trattoria',
    description:
      'Authentic Neapolitan pizza from a 480 °C wood-fired oven, handmade tagliatelle and tiramisù made fresh every morning. Cozy candlelit interior with exposed brick.',
    cuisineType: ['pizza_pasta', 'mediterranean'],
    priceRange: 2,
    phone: '+376 845 678',
    email: 'ciao@latrattoria.ad',
    website: 'https://latrattoria.ad',
    address: 'Carrer Major, 12, Escaldes-Engordany',
    parish: 'ESCALDES_ENGORDANY' as const,
    latitude: 42.5092,
    longitude: 1.5349,
    isActive: true,
    isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=600&fit=crop',
    ],
    avgRating: 4.4,
    reviewCount: 456,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:30', isClosed: true },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 3, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 4, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 5, openTime: '12:00', closeTime: '23:30', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '23:30', isClosed: false },
    ],
  },

  // ───────────────────────── 5. THE BURGER LAB ─────────────────────────
  {
    name: 'The Burger Lab',
    slug: 'the-burger-lab',
    description:
      'Gourmet smash burgers with house-ground blends, truffle fries and 18 craft beers on tap. Neon-lit industrial interior. Best late-night spot in Escaldes.',
    cuisineType: ['burgers'],
    priceRange: 2,
    phone: '+376 823 456',
    email: 'eat@burgerlab.ad',
    website: 'https://burgerlab.ad',
    address: 'Avinguda Carlemany, 45, Escaldes-Engordany',
    parish: 'ESCALDES_ENGORDANY' as const,
    latitude: 42.5100,
    longitude: 1.5365,
    isActive: true,
    isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=600&fit=crop',
    ],
    avgRating: 4.2,
    reviewCount: 389,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 3, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 4, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isClosed: false },
    ],
  },

  // ───────────────────────── 6. VERDANA ─────────────────────────
  {
    name: 'Verdana',
    slug: 'verdana',
    description:
      'Plant-forward bowls, açaí smoothies, cold-pressed juices and guilt-free weekend brunch. Bright, airy space with living walls and a sunny terrace.',
    cuisineType: ['healthy', 'brunch'],
    priceRange: 2,
    phone: '+376 856 789',
    email: 'hola@verdana.ad',
    website: 'https://verdana.ad',
    address: 'Plaça Coprínceps, 3, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA' as const,
    latitude: 42.5068,
    longitude: 1.5225,
    isActive: true,
    isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop',
    ],
    avgRating: 4.5,
    reviewCount: 198,
    hours: [
      { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: true },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
      { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00', isClosed: false },
      { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00', isClosed: false },
    ],
  },

  // ───────────────────────── 7. EL CELLER ─────────────────────────
  {
    name: 'El Celler',
    slug: 'el-celler',
    description:
      'Seasonal 7-course tasting menus with wine pairing in a restored 16th-century cellar. Michelin-recommended. Reservations required; limited to 24 covers per evening.',
    cuisineType: ['fine_dining', 'mediterranean'],
    priceRange: 4,
    phone: '+376 878 901',
    email: 'reservations@elceller.ad',
    website: 'https://elceller.ad',
    address: 'Carrer Prat de la Creu, 8, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA' as const,
    latitude: 42.5058,
    longitude: 1.5210,
    isActive: true,
    isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=600&fit=crop',
    ],
    avgRating: 4.9,
    reviewCount: 142,
    hours: [
      { dayOfWeek: 0, openTime: '19:00', closeTime: '23:00', isClosed: true },
      { dayOfWeek: 1, openTime: '19:00', closeTime: '23:00', isClosed: true },
      { dayOfWeek: 2, openTime: '19:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 3, openTime: '19:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 4, openTime: '19:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 5, openTime: '19:00', closeTime: '00:00', isClosed: false },
      { dayOfWeek: 6, openTime: '19:00', closeTime: '00:00', isClosed: false },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━ NEW RESTAURANTS ━━━━━━━━━━━━━━━━━━━━━━━━

  // ───────────────────────── 8. MAR BLAU ─────────────────────────
  {
    name: 'Mar Blau',
    slug: 'mar-blau',
    description:
      'The freshest Atlantic seafood in the Pyrenees. Whole grilled turbot, razor clams, lobster rice and a raw bar with daily oyster selection. Elegant nautical-themed dining room with mountain views.',
    cuisineType: ['seafood', 'mediterranean'],
    priceRange: 3,
    phone: '+376 861 234',
    email: 'reservas@marblau.ad',
    website: 'https://marblau.ad',
    address: 'Carrer dels Escalls, 7, La Massana',
    parish: 'LA_MASSANA' as const,
    latitude: 42.5400,
    longitude: 1.5148,
    isActive: true,
    isFeatured: true,
    coverImage: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1590759668628-05b0fc34bb70?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1535140728325-a4d3707eee61?w=800&h=600&fit=crop',
    ],
    avgRating: 4.5,
    reviewCount: 163,
    hours: [
      { dayOfWeek: 0, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 1, openTime: '13:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 2, openTime: '13:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 3, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '13:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '13:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 6, openTime: '13:00', closeTime: '23:00', isClosed: false },
    ],
  },

  // ───────────────────────── 9. LA CANTINA ─────────────────────────
  {
    name: 'La Cantina',
    slug: 'la-cantina',
    description:
      'Vibrant Mexican flavours at 1,300 m altitude. Handmade corn tortillas, 48-hour carnitas, guacamole made tableside and over 60 mezcals & tequilas. Live mariachi every Friday night.',
    cuisineType: ['mexican', 'tapas'],
    priceRange: 2,
    phone: '+376 831 567',
    email: 'hola@lacantina.ad',
    website: 'https://lacantina.ad',
    address: 'Plaça dels Arinsal, 2, Encamp',
    parish: 'ENCAMP' as const,
    latitude: 42.5340,
    longitude: 1.5805,
    isActive: true,
    isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=800&h=600&fit=crop',
    ],
    avgRating: 4.3,
    reviewCount: 276,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '22:30', isClosed: true },
      { dayOfWeek: 3, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 4, openTime: '12:00', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 5, openTime: '12:00', closeTime: '00:00', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '00:00', isClosed: false },
    ],
  },

  // ───────────────────────── 10. NOODLE HOUSE ─────────────────────────
  {
    name: 'Noodle House',
    slug: 'noodle-house',
    description:
      'Steaming bowls of ramen, hand-pulled udon, crispy gyoza and bao buns in a warm, modern space inspired by Tokyo alley bars. Vegetarian and vegan options on every section of the menu.',
    cuisineType: ['asian', 'healthy'],
    priceRange: 2,
    phone: '+376 872 890',
    email: 'info@noodlehouse.ad',
    website: 'https://noodlehouse.ad',
    address: 'Avinguda de Sant Joan de Caselles, 15, Canillo',
    parish: 'CANILLO' as const,
    latitude: 42.5672,
    longitude: 1.5988,
    isActive: true,
    isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&h=600&fit=crop',
    ],
    avgRating: 4.4,
    reviewCount: 201,
    hours: [
      { dayOfWeek: 0, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00', closeTime: '22:00', isClosed: true },
      { dayOfWeek: 2, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 3, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 4, openTime: '12:00', closeTime: '22:00', isClosed: false },
      { dayOfWeek: 5, openTime: '12:00', closeTime: '23:00', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00', closeTime: '23:00', isClosed: false },
    ],
  },

  // ───────────────────────── 11. BRASA & MAR ─────────────────────────
  {
    name: 'Brasa & Mar',
    slug: 'brasa-i-mar',
    description:
      'Premium dry-aged steaks and whole grilled fish cooked over charcoal on the open terrace. Signature bone-in ribeye, seafood platters and an award-winning Somontano wine list.',
    cuisineType: ['steakhouse', 'seafood'],
    priceRange: 3,
    phone: '+376 844 321',
    email: 'book@brasaimar.ad',
    website: 'https://brasaimar.ad',
    address: "Avinguda Verge de Canòlich, 30, Sant Julià de Lòria",
    parish: 'SANT_JULIA_DE_LORIA' as const,
    latitude: 42.4636,
    longitude: 1.4910,
    isActive: true,
    isFeatured: false,
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1558030006-450675393462?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    ],
    avgRating: 4.6,
    reviewCount: 134,
    hours: [
      { dayOfWeek: 0, openTime: '12:30', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 1, openTime: '12:30', closeTime: '22:30', isClosed: true },
      { dayOfWeek: 2, openTime: '12:30', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 3, openTime: '12:30', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 4, openTime: '12:30', closeTime: '22:30', isClosed: false },
      { dayOfWeek: 5, openTime: '12:30', closeTime: '23:30', isClosed: false },
      { dayOfWeek: 6, openTime: '12:30', closeTime: '23:30', isClosed: false },
    ],
  },
];

const main = async () => {
  console.log('🌱 Seeding database...\n');

  for (const restaurantData of RESTAURANTS_SEED) {
    const { hours, ...data } = restaurantData;

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
        isFeatured: data.isFeatured ?? false,
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

    const slotService = new SlotService(prisma);
    await slotService.generateSlotsForRestaurant(restaurant.id, 30);

    console.log(`  ✅ ${restaurant.name} (${data.parish})`);
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

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Seed completado! 🎉');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n  📧 Usuario test:');
  console.log('     test@taula.ad / password123');
  console.log('\n  🏪 Panel restaurante (cualquiera):');
  console.log('     owner@borda-jovell.taula.ad / password123');
  console.log('     owner@mar-blau.taula.ad / password123');
  console.log('     ...etc\n');
};

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
