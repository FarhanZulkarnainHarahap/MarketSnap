import { Request, Response } from "express";
import { prisma } from "../../../config/prisma-client.js";
import { CustomJwtPayload } from "../../../types/express.js";

export async function deleteStockEntry(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user || user.role !== "SUPER_ADMIN") {
      res
        .status(403)
        .json({ message: "Only Super Admin can delete stock entries" });
      return;
    }

    const { storeId, productId } = req.params;

    const existing = await prisma.storeProduct.findUnique({
      where: { productId_storeId: { productId, storeId } },
      include: { Product: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Stock entry not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventoryJournal.create({
        data: {
          storeId,
          productId,
          quantity: (-existing.stock).toString(),
          weight: existing.Product.weight,
          action: "SALE",
          userId: user.id,
        },
      });

      await tx.storeProduct.update({
        where: { productId_storeId: { productId, storeId } },
        data: { deletedAt: new Date(), stock: 0 },
      });
    });

    res.status(200).json({ message: "Stock entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting stock entry:", error);
    res.status(500).json({ message: "Failed to delete stock entry" });
  }
}
