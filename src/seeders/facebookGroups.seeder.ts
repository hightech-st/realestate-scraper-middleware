import { PrismaClient } from '@prisma/client';

const facebookGroups = [
  {
    id: '579112545816180',
    group_id: '579112545816180',
    group_link: 'https://www.facebook.com/groups/579112545816180/',
    group_name: 'CĂN HỘ CHUNG CƯ ĐÀ NẴNG',
    group_location: 'Đà Nẵng',
    for_foreigner: false
  }
];

export async function seedFacebookGroups(prisma: PrismaClient) {
  console.log('🌱 Seeding Facebook Groups...');
  for (const group of facebookGroups) {
    await prisma.facebookGroups.upsert({
      where: { id: group.id },
      update: group,
      create: group
    });
  }

  console.log('✅ Facebook Groups seeded successfully');
}
