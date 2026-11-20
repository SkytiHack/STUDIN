import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const res = await prisma.user.updateMany({
    data: {
      notifyChanges: false
    }
  });
  console.log(`Updated ${res.count} users to notifyChanges = false`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
