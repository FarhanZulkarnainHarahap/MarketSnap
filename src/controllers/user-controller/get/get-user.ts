import { Request, Response } from "express";
import { prisma } from "../../../config/prisma-client.js";
import { CustomJwtPayload } from "../../../types/express.js";
import jwt from "jsonwebtoken";
import { Role } from "../../../generated/prisma/index.js";

export async function getAllUser(req: Request, res: Response) {
  try {
    // Ambil query parameters
    const {
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      sortOrder = "desc",
      search = "",
      role = "",
    } = req.query;

    // Convert string ke number untuk pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Validasi sortBy untuk mencegah injection
    const allowedSortFields = [
      "id",
      "username",
      "email",
      "firstName",
      "lastName",
      "role",
      "createdAt",
    ];
    const validSortBy = allowedSortFields.includes(sortBy as string)
      ? (sortBy as string)
      : "createdAt";
    const validSortOrder = sortOrder === "asc" ? "asc" : "desc";

    // Build where clause untuk filtering
    const whereClause: any = {};

    // Search filter (mencari di multiple fields)
    if (search) {
      whereClause.OR = [
        { username: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Role filter
    if (role && role !== "") {
      whereClause.role = role as Role;
    }
    // Get total count untuk pagination info
    const totalUsers = await prisma.user.count({
      where: whereClause,
    });

    // Get users with pagination, filtering, and sorting
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        [validSortBy]: validSortOrder,
      },
      skip: skip,
      take: limitNum,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalUsers / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Response dengan metadata pagination
    res.status(200).json({
      message: "Get All users success",
      data: users,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalUsers: totalUsers,
        usersPerPage: limitNum,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
      filters: {
        search: search || null,
        role: role || null,
        sortBy: validSortBy,
        sortOrder: validSortOrder,
      },
    });
  } catch (error) {
    console.error("get All User Error:", error);
    res.status(500).json({ message: "Failed to get users" });
  }
}

/* -------------------------------------------------------------------------- */
/*                              GET CURRENT USER                              */
/* -------------------------------------------------------------------------- */
export async function getCurrentUser(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Extract the accessToken from cookies
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      res.status(401).json({ message: "Unauthorized. No token provided." });
      return;
    }

    // Verify and decode the JWT token to get user data (CustomJwtPayload)
    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_SECRET!
    ) as CustomJwtPayload;

    if (!decoded || !decoded.id) {
      res.status(401).json({ message: "Unauthorized. Invalid token." });
      return;
    }

    // Fetch the latest user data from the database using the decoded user ID
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        phoneNumber: true,
        isVerified: true,
        role: true, // Check if the user is verified
      },
    });

    // If user is not found
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    // Return the user data excluding the password
    res.status(200).json({ data: user });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: "Failed to get user data." });
  }
}

export async function getUsersByRole(req: Request, res: Response) {
  try {
    const roleParam = req.query.role as string;

    if (!roleParam) {
      res.status(400).json({ message: "Role query parameter is required." });
      return;
    }

    // Validasi role
    let prismaRole: Role;
    if (roleParam.toUpperCase() === "STORE_ADMIN") {
      prismaRole = Role.STORE_ADMIN;
    } else if (roleParam.toUpperCase() === "SUPER_ADMIN") {
      prismaRole = Role.SUPER_ADMIN;
    } else {
      res.status(400).json({ message: "Invalid role value." });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        role: prismaRole,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    res.status(200).json({
      message: "Users fetched successfully.",
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users." });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const user = req.user as CustomJwtPayload;

    const userWithStore = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        Store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!userWithStore) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      user: userWithStore,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
}
