import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const groups = [
    { name: 'Студент', rank: 1 },
    { name: 'Инструктор', rank: 2 },
    { name: 'Куратор', rank: 3 },
    { name: 'Супервизор', rank: 4 },
    { name: 'Опытный Супервизор', rank: 5 },
  ];

  for (const { name, rank } of groups) {
    await prisma.group.upsert({
      where: { name },
      update: { rank },
      create: { name, rank },
    });
  }

  console.log('✅ Группы с рангами созданы или обновлены.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
