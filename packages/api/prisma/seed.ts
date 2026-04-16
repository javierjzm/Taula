import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SlotService } from '../src/services/slot.service';

const prisma = new PrismaClient();

const RESTAURANTS_SEED = [
  {
    name: 'Borda Jovell',
    slug: 'borda-jovell',
    description: 'Cuina andorrana tradicional en una borda rústica amb vistes excepcionals.',
    cuisineType: ['andorrana', 'grill'],
    priceRange: 3,
    phone: '+376 835 151',
    address: "Ctra. de l'Obac, Ordino",
    parish: 'ORDINO' as const,
    latitude: 42.5558,
    longitude: 1.5330,
    isActive: true,
    coverImage: 'https://picsum.photos/seed/jovell/800/600',
    images: ['https://picsum.photos/seed/jovell1/800/600', 'https://picsum.photos/seed/jovell2/800/600'],
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
  {
    name: 'Restaurant Can Manel',
    slug: 'can-manel',
    description: 'Restaurant familiar amb cuina de mercat i vins de la terra.',
    cuisineType: ['espanyola', 'andorrana'],
    priceRange: 2,
    phone: '+376 869 264',
    address: 'Carrer de la Vall, 25, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA' as const,
    latitude: 42.5063,
    longitude: 1.5218,
    isActive: true,
    coverImage: 'https://picsum.photos/seed/canmanel/800/600',
    images: ['https://picsum.photos/seed/canmanel1/800/600'],
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
  {
    name: 'Japonès Sushi Andorra',
    slug: 'sushi-andorra',
    description: 'El millor sushi del Principat. Rolls creatius i peixos frescos.',
    cuisineType: ['japonesa'],
    priceRange: 3,
    phone: '+376 812 345',
    address: 'Avinguda Meritxell, 89, Andorra la Vella',
    parish: 'ANDORRA_LA_VELLA' as const,
    latitude: 42.5075,
    longitude: 1.5280,
    isActive: true,
    isFeatured: true,
    coverImage: 'https://picsum.photos/seed/sushi/800/600',
    images: ['https://picsum.photos/seed/sushi1/800/600', 'https://picsum.photos/seed/sushi2/800/600'],
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
];

const main = async () => {
  console.log('Seeding database...');

  for (const restaurantData of RESTAURANTS_SEED) {
    const { hours, ...data } = restaurantData;

    const restaurant = await prisma.restaurant.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
    });

    for (const hour of hours) {
      await prisma.openingHours.upsert({
        where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: hour.dayOfWeek } },
        update: {},
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

    console.log(`  OK: ${restaurant.name}`);
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

  console.log('\nSeed completado!');
  console.log('   Usuario test: test@taula.ad / password123');
  console.log('   Panel restaurante: owner@borda-jovell.taula.ad / password123');
};

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
