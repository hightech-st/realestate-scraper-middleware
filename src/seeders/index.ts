import { PrismaClient } from '@prisma/client';
import { seedFacebookGroups } from './facebookGroups.seeder.js';

export async function runSeeders() {
  const prisma = new PrismaClient();

  try {
    await seedFacebookGroups(prisma);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
