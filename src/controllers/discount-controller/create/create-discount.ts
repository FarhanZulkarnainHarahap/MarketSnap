import { Request, Response } from "express";
import { prisma } from "../../../config/prisma-client.js";
import { CustomJwtPayload } from "../../../types/express.js";
import { DiscountType } from "../../../generated/prisma/index.js";
export async function createDiscount(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const {
      storeId,
      productId,
      value,
      discountType,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
    } = req.body;

    // Validation
    if (
      !storeId ||
      !productId ||
      !value ||
      !discountType ||
      !startDate ||
      !endDate
    ) {
      res.status(400).json({
        message:
          "storeId, productId, value, discountType, startDate, and endDate are required",
      });
      return;
    }

    const validDiscountTypes: DiscountType[] = ["PERCENTAGE", "FIXED"];
    if (!validDiscountTypes.includes(discountType)) {
      res.status(400).json({ message: "Invalid discount type" });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      res.status(400).json({ message: "End date must be after start date" });
      return;
    }

    // Check if user has permission for this store
    if (user.role === "STORE_ADMIN") {
      const userStore = await prisma.store.findFirst({
        where: { id: storeId, userId: user.id },
      });
      if (!userStore) {
        res.status(403).json({
          message:
            "You don't have permission to create discount for this store",
        });
        return;
      }
    }

    // Check if store and product exist
    const [store, product] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.product.findUnique({ where: { id: productId, deletedAt: null } }),
    ]);

    if (!store || !product) {
      res.status(404).json({ message: "Store or product not found" });
      return;
    }

    // Create discount
    const discount = await prisma.discount.create({
      data: {
        storeId,
        productId,
        value: parseFloat(value),
        discountType,
        minPurchase: minPurchase ? parseFloat(minPurchase) : 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : 0,
        startDate: start,
        endDate: end,
      },
      include: {
        Store: true,
        Product: true,
      },
    });

    res.status(201).json({
      message: "Discount created successfully",
      data: discount,
    });
  } catch (error) {
    console.error("Error creating discount:", error);
    res.status(500).json({ message: "Failed to create discount" });
  }
}
