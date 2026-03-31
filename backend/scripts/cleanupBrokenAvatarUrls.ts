import { prisma } from "../lib/prisma";

function normalizeAvatarFileId(avatarUrl: string | null): string | null {
  if (typeof avatarUrl !== 'string') return null;

  const value = avatarUrl.trim();
  if (!value) return null;

  const prefix = '/uploads/';
  if (!value.startsWith(prefix)) return null;

  const fileId = value.slice(prefix.length).trim();
  return fileId || null;
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      avatarUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
    },
  });

  console.log(`Найдено пользователей с avatarUrl: ${users.length}`);

  let clearedInvalidFormat = 0;
  let clearedMissingFile = 0;
  let okCount = 0;

  for (const user of users) {
    const fileId = normalizeAvatarFileId(user.avatarUrl);

    if (!fileId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: null },
      });

      clearedInvalidFormat += 1;
      console.log(
        `[CLEARED_INVALID_FORMAT] ${user.email} | ${user.fullName} | ${user.avatarUrl}`,
      );
      continue;
    }

    const file = await prisma.uploadedFile.findUnique({
      where: { fileId },
      select: { id: true },
    });

    if (!file) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: null },
      });

      clearedMissingFile += 1;
      console.log(
        `[CLEARED_MISSING_FILE] ${user.email} | ${user.fullName} | ${user.avatarUrl}`,
      );
      continue;
    }

    okCount += 1;
  }

  console.log('Готово');
  console.log(`OK: ${okCount}`);
  console.log(`CLEARED_INVALID_FORMAT: ${clearedInvalidFormat}`);
  console.log(`CLEARED_MISSING_FILE: ${clearedMissingFile}`);
}

main()
  .catch((error) => {
    console.error('Ошибка при очистке avatarUrl:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
