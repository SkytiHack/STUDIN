const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const groups = await prisma.group.findMany({
    where: { name: { contains: 'ФІТ 1' } }
  });
  console.log(groups);
}
test();
