import '../../src/config/env.js';
import { PrismaClient } from '@prisma/client';

export const prismaTest = new PrismaClient();

export async function resetDatabase() {
  const models = [
    'notification',
    'movement',
    'requestItem',
    'request',
    'inventoryUnit',
    'item',
    'environment',
    'category',
    'user',
  ];

  for (const model of models) {
    await prismaTest[model].deleteMany();
  }
}
