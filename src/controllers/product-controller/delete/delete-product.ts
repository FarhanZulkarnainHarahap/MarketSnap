import { Request, Response } from "express";
import { prisma } from "@/config/prisma-client.js";

export async function deleteProduct(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const deleteDate = new Date();

    await Promise.all([
      prisma.product.update({
        where: { id },
        data: { deletedAt: deleteDate },
      }),
      prisma.productCategory.updateMany({
        where: { productId: id },
        data: { deletedAt: deleteDate },
      }),
      prisma.storeProduct.updateMany({
        where: { productId: id },
        data: { deletedAt: deleteDate },
      }),
    ]);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
}
