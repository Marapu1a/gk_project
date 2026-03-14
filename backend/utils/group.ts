// src/utils/userGroups.ts (или как у тебя файл называется)
import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Tx = PrismaClient | Prisma.TransactionClient;

export const ALLOWED_GROUPS = ['Инструктор', 'Куратор', 'Супервизор', 'Опытный Супервизор'] as const;
export type AllowedGroupName = (typeof ALLOWED_GROUPS)[number];

function getDb(prismaOrTx?: Tx): Tx {
  return prismaOrTx ?? prisma;
}

export async function addUserToGroup(
  userId: string,
  groupName: string,
  prismaOrTx?: Tx
) {
  if (!ALLOWED_GROUPS.includes(groupName as any)) {
    throw new Error(`Недопустимая группа: ${groupName}`);
  }

  const db = getDb(prismaOrTx);

  const group = await db.group.findUnique({ where: { name: groupName } });
  if (!group) {
    throw new Error(`Группа "${groupName}" не существует`);
  }

  const exists = await db.userGroup.findFirst({
    where: { userId, groupId: group.id },
    select: { id: true },
  });

  if (!exists) {
    await db.userGroup.create({
      data: { userId, groupId: group.id },
    });
  }

  return group;
}

export async function removeUserFromGroup(
  userId: string,
  groupName: string,
  prismaOrTx?: Tx
) {
  const db = getDb(prismaOrTx);

  const group = await db.group.findUnique({ where: { name: groupName } });
  if (!group) return;

  await db.userGroup.deleteMany({
    where: { userId, groupId: group.id },
  });
}

export async function isUserInGroup(
  userId: string,
  groupName: string,
  prismaOrTx?: Tx
): Promise<boolean> {
  const db = getDb(prismaOrTx);

  const group = await db.group.findUnique({ where: { name: groupName } });
  if (!group) return false;

  const userGroup = await db.userGroup.findFirst({
    where: { userId, groupId: group.id },
    select: { id: true },
  });

  return Boolean(userGroup);
}
