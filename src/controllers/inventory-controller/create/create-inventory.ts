import { Request, Response } from "express";
import prisma from "../../../config/prisma-client.js";
import { CustomJwtPayload } from "../../../types/express.js";
import { updateStockOperation } from "../update/update-inventory.js";

export async function createStockEntry(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user || user.role !== "SUPER_ADMIN") {
      res
        .status(403)
        .json({ message: "Only Super Admin can create stock entries" });
      return;
    }

    const { storeId, productId, initialStock } = req.body;
    const stockNum = parseInt(initialStock);

    if (!storeId || !productId || stockNum < 0) {
      res.status(400).json({ message: "Invalid input data" });
      return;
    }

    const existing = await prisma.storeProduct.findUnique({
      where: { productId_storeId: { productId, storeId } },
    });

    if (existing) {
      res.status(400).json({ message: "Stock entry already exists" });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    await updateStockOperation(
      storeId,
      productId,
      stockNum,
      "ADD",
      user,
      product.weight,
      true
    );

    res.status(201).json({ message: "Stock entry created successfully" });
  } catch (error) {
    console.error("Error creating stock entry:", error);
    res.status(500).json({ message: "Failed to create stock entry" });
  }
}
