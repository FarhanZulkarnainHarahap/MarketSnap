import express from "express";

import { verifyToken } from "../middleware/auth-middleware.js";
import multer from "multer";
import { createManualCheckoutOrder } from "../controllers/order-controller/order.controller.js";

const router = express.Router();
const upload = multer();

router.post(
  "/manual",
  verifyToken,
  upload.single("paymentProof"),
  createManualCheckoutOrder
);

export default router;
