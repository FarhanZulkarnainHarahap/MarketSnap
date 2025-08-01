// src/config/prisma-client.ts
import { PrismaClient } from "../generated/prisma/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error", "warn", "info"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
