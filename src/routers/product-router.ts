import express from "express";

import { verifyToken, roleGuard } from "../middleware/auth-middleware.js";
import { upload } from "../middleware/upload-middleware.js";
import {
  getAllProduct,
  getAllProductsByCity,
  getAllProductsByStore,
  getNearbyProducts,
  getProductById,
} from "../controllers/product-controller/get/get-product.js";
import { createProduct } from "../controllers/product-controller/create/create-product.js";
import { createStoreProduct } from "../controllers/store-controller/create/create-store.js";
import { updateProduct } from "../controllers/product-controller/update/update-product.js";
import { deleteProduct } from "../controllers/product-controller/delete/delete-product.js";

const router = express.Router();

router
  .route("/")
  .get(getAllProduct)
  .post(
    verifyToken,
    roleGuard("SUPER_ADMIN", "STORE_ADMIN"),
    upload.fields([
      { name: "imagePreview", maxCount: 1 },
      { name: "imageContent", maxCount: 3 },
    ]),
    createProduct
  )
  .post(verifyToken, roleGuard("SUPER_ADMIN"), createStoreProduct);

router.route("/nearby").get(getNearbyProducts);
router.route("/by-province").get(getAllProductsByCity);
router.route("/by-store").get(getAllProductsByStore);

router
  .route("/:id")
  .get(getProductById)
  .patch(
    verifyToken,
    roleGuard("SUPER_ADMIN", "STORE_ADMIN"),
    upload.fields([
      { name: "imagePreview", maxCount: 1 },
      { name: "imageContent", maxCount: 3 },
    ]),
    updateProduct
  )

  .delete(verifyToken, roleGuard("SUPER_ADMIN"), deleteProduct);

export default router;
