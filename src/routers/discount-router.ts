import express from "express";

import { verifyToken, roleGuard } from "../middleware/auth-middleware.js";
import {
  getDiscounts,
  getDiscountUsageReport,
} from "../controllers/discount-controller/get/get-discount.js";
import { createDiscount } from "../controllers/discount-controller/create/create-discount.js";
import { updateDiscount } from "../controllers/discount-controller/update/update-discount.js";
import { deleteDiscount } from "../controllers/discount-controller/delete/delete-discount.js";

const router = express.Router();

router
  .route("/")
  .get(verifyToken, roleGuard("SUPER_ADMIN", "STORE_ADMIN"), getDiscounts)
  .post(verifyToken, roleGuard("SUPER_ADMIN", "STORE_ADMIN"), createDiscount);

router
  .route("/usage-report")
  .get(
    verifyToken,
    roleGuard("SUPER_ADMIN", "STORE_ADMIN"),
    getDiscountUsageReport
  );

router
  .route("/:id")
  .put(verifyToken, roleGuard("SUPER_ADMIN", "STORE_ADMIN"), updateDiscount)
  .delete(verifyToken, roleGuard("SUPER_ADMIN", "STORE_ADMIN"), deleteDiscount);

export default router;
