import { Request, Response } from "express";
import prisma from "../../../config/prisma-client.js";
import { getOrCreateCart } from "../get/cart.js";

export async function addToCart(req: Request, res: Response) {
  try {
    const userId = (req.user as { id: string }).id;
    const { productId, storeId, quantity = 1 } = req.body;

    if (!productId || !storeId || quantity < 1) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const storeProduct = await prisma.storeProduct.findUnique({
      where: {
        productId_storeId: { productId, storeId },
      },
      include: {
        Product: true,
      },
    });

    if (!storeProduct) {
      res.status(404).json({ message: "Product not found in this store" });
      return;
    }

    if (storeProduct.stock < quantity) {
      res
        .status(400)
        .json({ message: "Insufficient stock for requested quantity" });
      return;
    }

    const cart = await getOrCreateCart(userId);

    const existingLine = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    const line = existingLine
      ? await prisma.cartItem.update({
          where: { id: existingLine.id },
          data: {
            quantity: existingLine.quantity + quantity,
            unitPrice: storeProduct.Product.price,
          },
        })
      : await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
            unitPrice: storeProduct.Product.price,
          },
        });

    res.status(201).json({ data: line });
  } catch (err) {
    console.error("addToCart:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
