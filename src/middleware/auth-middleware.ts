import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CustomJwtPayload, GoogleJwtPayload } from "../types/express.js"; // Pastikan Anda menyimpan CLIENT_ID di .env

/* ------------------------------------ 1 ----------------------------------- */
// 1. Check token ada atau tidak
// 2. Validasi token yang ada

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    res.status(401).json({ message: "Unauthorized: Token not found" });
    return;
  }

  try {
    const payload = jwt.verify(accessToken, process.env.JWT_SECRET!) as
      | CustomJwtPayload
      | GoogleJwtPayload;
    if (!payload) {
      res.status(401).json({ message: "Token verification failed" });
      return;
    }
    // Optional: kamu bisa validasi `provider` kalau mau
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
}
/* ------------------------------------ 2 ----------------------------------- */
export function roleGuard(...roles: string[]) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const user = req.user as CustomJwtPayload | GoogleJwtPayload;

    if (roles.includes(user.role)) {
      next();
      return;
    }

    res.status(403).json({ message: "Unauthorized access" });
  };
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: "No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as CustomJwtPayload;
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ message: "Invalid token." });
  }
}
