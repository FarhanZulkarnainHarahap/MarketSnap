import { Request, Response } from "express";
import prisma from "../../../config/prisma-client.js";
import { CustomJwtPayload } from "../../../types/express.js";

export async function deleteDiscount(
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
        message: "You don't have permission to delete this discount",
      });
      return;
    }

    // Soft delete
    await prisma.discount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.status(200).json({ message: "Discount deleted successfully" });
  } catch (error) {
    console.error("Error deleting discount:", error);
    res.status(500).json({ message: "Failed to delete discount" });
  }
}
