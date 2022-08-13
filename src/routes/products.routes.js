import { Router } from "express";
const router = Router();

import * as productsCtrl from "../controllers/products.controller";
import { authJwt } from "../middlewares";

router.get("/", [authJwt.verifyToken], productsCtrl.getProducts);

//router.get("/:productId", productsCtrl.getProductById);

router.get("/store/:storeId",[authJwt.verifyToken], productsCtrl.getProductosByStoreId);

router.get("/productId/:productId",[authJwt.verifyToken], productsCtrl.getProductById);

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

router.post(
  "/chStatus/:productId",
  [ authJwt.verifyToken, authJwt.isAdminMaster ],
  productsCtrl.changeStatusProductById
);

router.post(
  "/updateProducto/:productId",
  [ authJwt.verifyToken, authJwt.isAdminMaster ],
  productsCtrl.postUpdateProducto
);

export default router;
