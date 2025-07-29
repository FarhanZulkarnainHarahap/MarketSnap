import { Request, Response } from "express";
import { prisma } from "../../../config/prisma-client.js";
import { CustomJwtPayload } from "../../../types/express.js";
export async function updateDiscount(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { id } = req.params;
    const {
      value,
      discountType,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
    } = req.body;

    // Check if discount exists
    const existingDiscount = await prisma.discount.findUnique({
      where: { id, deletedAt: null },
      include: { Store: true },
    });

    if (!existingDiscount) {
      res.status(404).json({ message: "Discount not found" });
      return;
    }

    // Check permission
    if (
      user.role === "STORE_ADMIN" &&
      existingDiscount.Store.userId !== user.id
    ) {
      res.status(403).json({
        message: "You don't have permission to update this discount",
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (value !== undefined) updateData.value = parseFloat(value);
    if (discountType !== undefined) updateData.discountType = discountType;
    if (minPurchase !== undefined)
      updateData.minPurchase = parseFloat(minPurchase);
    if (maxDiscount !== undefined)
      updateData.maxDiscount = parseFloat(maxDiscount);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);

    // Validate dates if both are provided
    if (
      updateData.startDate &&
      updateData.endDate &&
      updateData.startDate >= updateData.endDate
    ) {
      res.status(400).json({ message: "End date must be after start date" });
      return;
    }

    const updatedDiscount = await prisma.discount.update({
      where: { id },
      data: { ...updateData, updatedAt: new Date() },
      include: {
        Store: true,
        Product: true,
      },
    });

    res.status(200).json({
      message: "Discount updated successfully",
      data: updatedDiscount,
    });
  } catch (error) {
    console.error("Error updating discount:", error);
    res.status(500).json({ message: "Failed to update discount" });
  }
}
