import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const DEFAULT_COUNTRY_DIGITS = 10;

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

function getClient(client?: PrismaClientLike) {
  return client ?? prisma;
}

function extractAreaCode(phoneNumber: string): string | null {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < DEFAULT_COUNTRY_DIGITS) return null;
  const local = digits.slice(-DEFAULT_COUNTRY_DIGITS);
  return local.slice(0, 3);
}

export async function assignAvailableNumber(
  userId: string,
  areaCode?: string,
  client?: PrismaClientLike
): Promise<string | null> {
  const db = getClient(client);

  const execute = async (tx: PrismaClientLike) => {
    const candidate = await tx.phoneNumberInventory.findFirst({
      where: {
        status: 'AVAILABLE',
        ...(areaCode ? { areaCode } : {}),
      },
      orderBy: { updatedAt: 'asc' },
    });

    if (!candidate) {
      return null;
    }

    const updated = await tx.phoneNumberInventory.update({
      where: { id: candidate.id },
      data: {
        status: 'ASSIGNED',
        assignedUserId: userId,
        assignedAt: new Date(),
        releasedAt: null,
      },
    });

    return updated.phoneNumber;
  };

  if ('$transaction' in db) {
    return (db as typeof prisma).$transaction(async (tx) => execute(tx));
  }

  return execute(db);
}

export async function addNumberToInventory(
  phoneNumber: string,
  userId?: string,
  client?: PrismaClientLike
): Promise<void> {
  const db = getClient(client);
  const areaCode = extractAreaCode(phoneNumber);
  const now = new Date();

  await db.phoneNumberInventory.upsert({
    where: { phoneNumber },
    create: {
      phoneNumber,
      areaCode: areaCode || undefined,
      status: userId ? 'ASSIGNED' : 'AVAILABLE',
      assignedUserId: userId || null,
      assignedAt: userId ? now : null,
      releasedAt: userId ? null : now,
    },
    update: {
      areaCode: areaCode || undefined,
      status: userId ? 'ASSIGNED' : 'AVAILABLE',
      assignedUserId: userId || null,
      assignedAt: userId ? now : null,
      releasedAt: userId ? null : now,
    },
  });
}

export async function releaseNumberToInventory(
  phoneNumber: string,
  client?: PrismaClientLike
): Promise<void> {
  const db = getClient(client);
  const areaCode = extractAreaCode(phoneNumber);

  await db.phoneNumberInventory.upsert({
    where: { phoneNumber },
    create: {
      phoneNumber,
      areaCode: areaCode || undefined,
      status: 'AVAILABLE',
      assignedUserId: null,
      assignedAt: null,
      releasedAt: new Date(),
    },
    update: {
      areaCode: areaCode || undefined,
      status: 'AVAILABLE',
      assignedUserId: null,
      assignedAt: null,
      releasedAt: new Date(),
    },
  });
}
