import { Request, Response } from "express";
import { prisma } from "@/config/prisma-client.js";

export async function updateCartItem(req: Request, res: Response) {
  try {
    const userId = (req.user as { id: string }).id;
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      res.status(400).json({ message: "Quantity must be ≥ 1" });
    }

    const line = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        Cart: true,
        Product: true,
      },
    });

    if (!line || line.Cart.userId !== userId) {
      res.status(404).json({ message: "Cart item not found" });
      return;
    }

    // Ambil stok dari StoreProduct berdasarkan productId dan storeId
    const storeProduct = await prisma.storeProduct.findFirst({
      where: {
        productId: line.productId,
      },
    });

    if (!storeProduct) {
      res.status(404).json({ message: "Store product not found" });
      return;
    }

    if (storeProduct.stock < quantity) {
      res.status(400).json({ message: "Insufficient stock" });
      return;
    }

    const updated = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    res.status(200).json({ data: updated });
  } catch (err) {
    console.error("updateCartItem:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
