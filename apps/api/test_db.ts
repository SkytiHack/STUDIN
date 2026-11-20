import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const g = await prisma.group.findFirst({ where: { name: 'ФІТ 2-6' }});
  console.log('Group ФІТ 2-6:', g);
  
  if (g) {
    const lessons = await prisma.scheduleItem.findMany({ 
      where: { groupId: g.id },
      orderBy: { date: 'asc' }
    });
    console.log(`Lessons for ФІТ 2-6: ${lessons.length}`);
    for (const l of lessons) {
      console.log(`  ${l.date.toISOString().split('T')[0]} - ${l.subject}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
