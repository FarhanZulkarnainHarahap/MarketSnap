import { Router } from "express";

import { verifyToken } from "../middleware/auth-middleware.js";
import { getCart } from "../controllers/cart-controller/get/cart.js";
import { addToCart } from "../controllers/cart-controller/create/addToCart.js";
import { updateCartItem } from "../controllers/cart-controller/update/updateCartItem.js";
import { deleteCartItem } from "../controllers/cart-controller/delete/deleteCartItem.js";

const router = Router();

/* every route requires an authenticated user */

router.use(verifyToken);
router.get("/index", getCart); // GET    /api/v1/cart
router.post("/", addToCart); // POST   /api/v1/cart
router.patch("/:cartItemId", updateCartItem); // PATCH  /api/v1/cart/:cartItemId
router.delete("/:cartItemId", deleteCartItem); // DELETE /api/v1/cart/:cartItemId

export default router;
