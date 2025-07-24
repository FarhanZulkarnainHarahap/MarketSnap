import { Request, Response } from "express";
import prisma from "../../../config/prisma-client.js";

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findFirst({
    where: { userId, CartItem: { some: {} } },
    include: { CartItem: true },
  });
  if (existing) return existing;

  return prisma.cart.create({
    data: { userId },
    include: { CartItem: true },
  });
}

export async function getCart(req: Request, res: Response) {
  try {
    const userId = (req.user as { id: string }).id;
    const cart = await getOrCreateCart(userId);

    const items = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        Product: {
          include: {
            ProductCategory: { include: { Category: true } },
            User: true,
            imageContent: true,
            imagePreview: true,
          },
        },
      },
    });

    res.json({ data: items });
  } catch (err) {
    console.error("getCart:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
