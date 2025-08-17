// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // группы
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
  console.log('✅ Группы созданы/обновлены.');

  // админ
  const email = 'admin@admin.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const password = await bcrypt.hash('111111', 10);
    const adminUser = await prisma.user.create({
      data: {
        email,
        password,
        fullName: 'Администратор',
        role: 'ADMIN',
        isEmailConfirmed: true,
      },
    });

    const supervisorGroup = await prisma.group.findFirst({
      where: { name: 'Опытный Супервизор' },
    });

    if (supervisorGroup) {
      await prisma.userGroup.create({
        data: { userId: adminUser.id, groupId: supervisorGroup.id },
      });
    }

    console.log('✅ Админ создан: admin@admin.com / 111111');
  } else {
    console.log('ℹ️ Админ уже существует, пропущено.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
