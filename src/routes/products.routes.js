import { Router } from "express";
const router = Router();

import * as productsCtrl from "../controllers/products.controller";
import { authJwt } from "../middlewares";

router.get("/", [authJwt.verifyToken], productsCtrl.getProducts);

router.get("/:productId", productsCtrl.getProductById);

router.get("/store/:storeId",[authJwt.verifyToken], productsCtrl.getProductosByStoreId);

router.get("/storep/:storeId",[authJwt.verifyToken], productsCtrl.getProductosByStoreIdAndPopulate);

router.post(
  "/createProducto",
  [authJwt.verifyToken],
  productsCtrl.createProduct
);

router.put(
  "/:productId",
  [authJwt.verifyToken, authJwt.isModerator],
  productsCtrl.updateProductById
);

router.delete(
  "/:productId",
  [authJwt.verifyToken, authJwt.isAdmin],
  productsCtrl.deleteProductById
);

export default router;
