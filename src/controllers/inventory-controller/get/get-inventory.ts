import { Request, Response } from "express";
import prisma from "../../../config/prisma-client.js";
import { CustomJwtPayload } from "../../../types/express";
import { InventoryAction } from "../../../generated/prisma/index.js";

const buildWhereClause = async (
  user: CustomJwtPayload,
  additionalFilters: any = {}
) => {
  let whereClause = { deletedAt: null, ...additionalFilters };
  if (user.role === "STORE_ADMIN") {
    const userStores = await prisma.store.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    whereClause.storeId = { in: userStores.map((store) => store.id) };
  }
  return whereClause;
};

const getPaginationData = (
  page: string | undefined,
  limit: string | undefined
) => {
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 10;
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
};

export async function getInventoryData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { storeId, productId, page, limit } = req.query;
    const { pageNum, limitNum, skip } = getPaginationData(
      page as string,
      limit as string
    );

    const additionalFilters: any = {};
    if (storeId && user.role === "SUPER_ADMIN")
      additionalFilters.storeId = storeId;
    if (productId) additionalFilters.productId = productId;

    const whereClause = await buildWhereClause(user, additionalFilters);

    const [totalItems, inventoryData] = await Promise.all([
      prisma.storeProduct.count({ where: whereClause }),
      prisma.storeProduct.findMany({
        where: whereClause,
        include: {
          Product: {
            include: {
              imagePreview: true,
              ProductCategory: { include: { Category: true } },
            },
          },
          Store: { include: { StoreAddress: { include: { Address: true } } } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      message: "Inventory data retrieved successfully",
      data: inventoryData,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error getting inventory data:", error);
    res.status(500).json({ message: "Failed to get inventory data" });
  }
}
export async function getInventoryHistory(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { storeId, productId, action, startDate, endDate, page, limit } =
      req.query;
    const { pageNum, limitNum, skip } = getPaginationData(
      page as string,
      limit as string
    );

    // Build filters
    let whereClause: any = {};

    // PERBAIKAN: Filter berdasarkan role
    if (user.role === "STORE_ADMIN") {
      // Store admin hanya bisa lihat tokonya sendiri
      const userStores = await prisma.store.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      if (userStores.length === 0) {
        res.status(403).json({ message: "No store assigned to this user" });
        return;
      }

      const userStoreIds = userStores.map((store) => store.id);
      whereClause.storeId = { in: userStoreIds };
    } else if (user.role === "SUPER_ADMIN") {
      // Super admin bisa filter berdasarkan storeId jika ada
      if (storeId) {
        whereClause.storeId = storeId as string;
      }
    } else {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Filter lainnya
    if (productId) whereClause.productId = productId as string;
    if (action) whereClause.action = action as InventoryAction;

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    // Get total count
    const totalItems = await prisma.inventoryJournal.count({
      where: whereClause,
    });

    // Get history data
    const historyData = await prisma.inventoryJournal.findMany({
      where: whereClause,
      include: {
        Store: true,
        Product: {
          include: {
            imagePreview: true,
            ProductCategory: { include: { Category: true } },
          },
        },
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      message: "Inventory history retrieved successfully",
      data: historyData,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error getting inventory history:", error);
    res.status(500).json({ message: "Failed to get inventory history" });
  }
}
export async function getLowStockAlerts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const threshold = parseInt(req.query.threshold as string) || 10;
    const whereClause = await buildWhereClause(user, {
      stock: { lte: threshold },
    });

    const lowStockItems = await prisma.storeProduct.findMany({
      where: whereClause,
      include: {
        Product: {
          include: {
            imagePreview: true,
            ProductCategory: { include: { Category: true } },
          },
        },
        Store: true,
      },
      orderBy: { stock: "asc" },
    });

    res.status(200).json({
      message: "Low stock items retrieved successfully",
      data: lowStockItems,
      threshold,
      totalLowStockItems: lowStockItems.length,
    });
  } catch (error) {
    console.error("Error getting low stock alerts:", error);
    res.status(500).json({ message: "Failed to get low stock alerts" });
  }
}
