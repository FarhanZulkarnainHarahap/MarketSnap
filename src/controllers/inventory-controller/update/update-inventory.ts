import { Request, Response } from "express";
import { prisma } from "@/config/prisma-client.js";
import { InventoryAction } from "../../../generated/prisma/index.js";
import { CustomJwtPayload } from "@/types/express.js";
export const updateStockOperation = async (
  storeId: string,
  productId: string,
  quantity: number,
  action: InventoryAction,
  user: CustomJwtPayload,
  weight: number,
  isCreate: boolean = false
) => {
  const currentStock = isCreate
    ? 0
    : (
        await prisma.storeProduct.findUnique({
          where: { productId_storeId: { productId, storeId } },
        })
      )?.stock || 0;

  let newStock: number;
  let actualQuantity: number;

  switch (action) {
    case "ADD":
    case "RESTOCK":
      newStock = currentStock + quantity;
      actualQuantity = quantity;
      break;
    case "SALE":
      if (currentStock < quantity) {
        throw new Error(
          `Insufficient stock. Current: ${currentStock}, Requested: ${quantity}`
        );
      }
      newStock = currentStock - quantity;
      actualQuantity = -quantity;
      break;
    default:
      throw new Error("Invalid action");
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryJournal.create({
      data: {
        storeId,
        productId,
        quantity: actualQuantity.toString(),
        weight,
        action,
        userId: user.id,
      },
    });

    await tx.storeProduct.upsert({
      where: { productId_storeId: { productId, storeId } },
      update: { stock: newStock, updatedAt: new Date() },
      create: { productId, storeId, stock: newStock },
    });
  });
};

/* -------------------------------------------------------------------------- */
/*                            UPDATE STOCK WITH JOURNAL                       */
/* -------------------------------------------------------------------------- */
export async function updateStockWithJournal(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { storeId, productId, quantity, action } = req.body;

    if (!storeId || !productId || !quantity || !action) {
      res.status(400).json({
        message: "storeId, productId, quantity, and action are required",
      });
      return;
    }

    const validActions: InventoryAction[] = ["RESTOCK", "SALE", "ADD"];
    if (!validActions.includes(action) || parseInt(quantity) <= 0) {
      res.status(400).json({
        message: "Invalid action or quantity",
      });
      return;
    }

    if (user.role === "STORE_ADMIN") {
      const userStore = await prisma.store.findFirst({
        where: { id: storeId, userId: user.id },
      });
      if (!userStore) {
        res.status(403).json({
          message: "You don't have permission to update this store's inventory",
        });
        return;
      }
    }

    const [store, product] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.product.findUnique({ where: { id: productId, deletedAt: null } }),
    ]);

    if (!store || !product) {
      res.status(404).json({ message: "Store or product not found" });
      return;
    }

    await updateStockOperation(
      storeId,
      productId,
      parseInt(quantity),
      action,
      user,
      product.weight
    );

    res.status(200).json({ message: "Stock updated successfully" });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ message: "Failed to update stock" });
  }
}
