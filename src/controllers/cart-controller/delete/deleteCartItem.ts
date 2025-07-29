import { Request, Response } from "express";
import { prisma } from "@/config/prisma-client.js";

export async function deleteCartItem(req: Request, res: Response) {
  try {
    const userId = (req.user as { id: string }).id;
    const { cartItemId } = req.params;

    const line = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { Cart: true },
    });
    if (!line || line.Cart.userId !== userId) {
      res.status(404).json({ message: "Cart item not found" });
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });
    res.status(204).end();
  } catch (err) {
    console.error("deleteCartItem:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
