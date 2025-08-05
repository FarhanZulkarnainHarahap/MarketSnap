import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../../config/prisma-client.js";

export async function login(req: Request, res: Response) {
  try {
    const { usernameOrEmail, password } = req.body;

    console.log("Login attempt with:", usernameOrEmail);

    // Cari user berdasarkan username atau email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!existingUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!existingUser.password) {
      res.status(400).json({ message: "User has no password set" });
      return;
    }

    const isValidPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isValidPassword) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    const accesstoken = jwt.sign(
      {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
      },
      process.env.JWT_SECRET!
    );

    if (!accesstoken) {
      res.status(500).json({ message: "Failed to generate token" });
      return;
    }

    // Set cookie dan kirim response dengan role
    res
      .cookie("accessToken", accesstoken, {
        httpOnly: true,
        secure: true, // wajib true untuk cross-origin HTTPS
        sameSite: "none", // wajib none agar cookie dikirim lintas origin
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ message: "Login success" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error });
  }
}
