import { Router } from "express";
const router = Router();

import * as categoriesCtrl from "../controllers/category.controller";
import { authJwt } from "../middlewares";

router.get("/", authJwt.verifyToken, categoriesCtrl.getCategories);

router.get("/store/:storeId", authJwt.verifyToken, categoriesCtrl.getCategoriasByStoreId);

router.post(
  "/createNewCategory",
  [authJwt.verifyToken],
  categoriesCtrl.createNewCategory
);
router.delete(
  "/eliminarCategoria",
  [authJwt.verifyToken],
  categoriesCtrl.eliminarCategoria
);

export default router;