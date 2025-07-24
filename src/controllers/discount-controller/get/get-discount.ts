import { Request, Response } from "express";
import { CustomJwtPayload } from "../../../types/express";
import prisma from "../../../config/prisma-client.js";

const buildDiscountWhereClause = async (
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

export async function getDiscounts(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { storeId, productId, page, limit, isActive } = req.query;
    const { pageNum, limitNum, skip } = getPaginationData(
      page as string,
      limit as string
    );

    const additionalFilters: any = {};
    if (storeId && user.role === "SUPER_ADMIN")
      additionalFilters.storeId = storeId;
    if (productId) additionalFilters.productId = productId;

    // Filter untuk active/expired discounts
    if (isActive === "true") {
      additionalFilters.endDate = { gte: new Date() };
      additionalFilters.startDate = { lte: new Date() };
    } else if (isActive === "false") {
      additionalFilters.endDate = { lt: new Date() };
    }

    const whereClause = await buildDiscountWhereClause(user, additionalFilters);

    const [totalItems, discounts] = await Promise.all([
      prisma.discount.count({ where: whereClause }),
      prisma.discount.findMany({
        where: whereClause,
        include: {
          Store: true,
          Product: {
            include: {
              imagePreview: true,
            },
          },
          DiscountUsage: {
            select: {
              id: true,
              totalAmount: true,
              createdAt: true,
              User: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      message: "Discounts retrieved successfully",
      data: discounts,
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
    console.error("Error getting discounts:", error);
    res.status(500).json({ message: "Failed to get discounts" });
  }
}

export async function getDiscountUsageReport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as CustomJwtPayload;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { storeId, startDate, endDate, page, limit } = req.query;
    const { pageNum, limitNum, skip } = getPaginationData(
      page as string,
      limit as string
    );

    // Build where clause for discount usage
    let whereClause: any = {};

    if (user.role === "STORE_ADMIN") {
      const userStores = await prisma.store.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      whereClause.Discount = {
        storeId: { in: userStores.map((store) => store.id) },
        deletedAt: null,
      };
    } else {
      whereClause.Discount = { deletedAt: null };
      if (storeId) {
        whereClause.Discount.storeId = storeId as string;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate as string);
      if (endDate) whereClause.createdAt.lte = new Date(endDate as string);
    }

    const [totalItems, usageData] = await Promise.all([
      prisma.discountUsage.count({ where: whereClause }),
      prisma.discountUsage.findMany({
        where: whereClause,
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          Discount: {
            include: {
              Store: true,
              Product: {
                include: {
                  imagePreview: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    // Calculate summary
    const totalDiscountAmount = usageData.reduce(
      (sum, usage) => sum + parseFloat(usage.totalAmount.toString()),
      0
    );

    res.status(200).json({
      message: "Discount usage report retrieved successfully",
      data: usageData,
      summary: {
        totalUsage: totalItems,
        totalDiscountAmount,
      },
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
    console.error("Error getting discount usage report:", error);
    res.status(500).json({ message: "Failed to get discount usage report" });
  }
}
