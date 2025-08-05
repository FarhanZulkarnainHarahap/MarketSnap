import "dotenv/config.js";
import express, { Request, Response, Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";

import authRouter from "./routers/auth-router.js";
import userRouter from "./routers/user-router.js";
import addressRouter from "./routers/address-router.js";
import productRouter from "./routers/product-router.js";
import cartRouter from "./routers/cart-router.js";
import storeRouter from "./routers/store-router.js";
import inventoryRouter from "./routers/inventory-router.js";
import discountRouter from "./routers/discount-router.js";
// import storeProductRouter from "./routers/storeProduct-router.js";
import categoryRouter from "./routers/category-router.js"; // Ganti dengan categoryRouter jika ada
import rajaOngkirRouter from "./routers/rajaongkir-router.js";
import checkoutManualRouter from "./routers/checkout-router.js";
// import paymentRouter from "./routers/payment-router.js.";

import "./config/passport.js"; // konfigurasi strategi Passport (GoogleStrategy)

const app: Application = express();
const PORT: string = process.env.PORT || "8000";

// CORS config
app.use(
  cors({
    origin: ["http://localhost:3000", "https://market-snap.vercel.app"], // Menambahkan localhost untuk development
    methods: ["GET", "POST", "PUT", "DELETE"], // Atur metode HTTP yang diizinkan
    credentials: true, // Mengizinkan pengiriman cookies dan headers
  })
);

// Parser
app.use(express.json());
app.use(cookieParser());

// Session (wajib sebelum passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "rahasia_super_aman",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // true jika HTTPS
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// RajaOngkir

app.use("/api/v1/rajaongkir", rajaOngkirRouter);

// Routing
app.use("/api/v1/auth", authRouter);

app.use("/api/v1/addresses", addressRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/stores", storeRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/discounts", discountRouter);

app.use("/api/v1/checkout", checkoutManualRouter);

// 🛡️ Endpoint dilindungi, bisa pakai verifyToken (JWT) atau verifyGoogleToken (session)
app.use("/api/v1/user", userRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/rajaongkir", rajaOngkirRouter);
// Health check

app.get("/confirm-email-view", (req: Request, res: Response) => {
  const token = req.query.token as string; // you can also get this from database/session if needed

  res.render("confirm-email", {
    token,
    apiBaseUrl: process.env.NEXT_PUBLIC_DOMAIN,
  });
});
app.get("/", async (request: Request, response: Response) => {
  response.send({
    message: "API is running",
    uptime: `${process.uptime().toFixed(2)} seconds`,
  });
});
app.get("/api/health", async (request: Request, response: Response) => {
  response.status(200).json({
    message: "API is running",
    uptime: `${process.uptime().toFixed(2)} seconds`,
  });
});
app.listen(PORT, () =>
  console.info(` 🚀 Server is listening on port: ${PORT}`)
);
export default app;
