import { prisma } from '../lib/prisma';

export const ALLOWED_GROUPS = [
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
]

export async function addUserToGroup(userId: string, groupName: string) {
  if (!ALLOWED_GROUPS.includes(groupName)) {
    throw new Error(`Недопустимая группа: ${groupName}`)
  }

  const group = await prisma.group.findUnique({ where: { name: groupName } })
  if (!group) {
    throw new Error(`Группа "${groupName}" не существует`)
  }

  const exists = await prisma.userGroup.findFirst({
    where: {
      userId,
      groupId: group.id,
    },
  })

  if (!exists) {
    await prisma.userGroup.create({
      data: {
        userId,
        groupId: group.id,
      },
    })
  }

  return group
}

export async function removeUserFromGroup(userId: string, groupName: string) {
  const group = await prisma.group.findUnique({ where: { name: groupName } });
  if (!group) return; // Группы вообще нет — ок

  await prisma.userGroup.deleteMany({
    where: {
      userId,
      groupId: group.id,
    },
  });
}

export async function isUserInGroup(userId: string, groupName: string): Promise<boolean> {
  const group = await prisma.group.findUnique({ where: { name: groupName } });
  if (!group) return false;

  const userGroup = await prisma.userGroup.findFirst({
    where: {
      userId,
      groupId: group.id,
    },
  });

  return Boolean(userGroup);
}
