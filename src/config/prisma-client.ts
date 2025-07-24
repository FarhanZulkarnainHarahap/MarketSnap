// src/config/prisma-client.ts
import { PrismaClient } from "../generated/prisma/index.js";

const globalThisPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalThisPrisma.prisma || new PrismaClient();

export default prisma;
