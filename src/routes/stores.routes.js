import { Router } from "express";
const router = Router();

import * as storesCtrl from "../controllers/stores.controller";
import { authJwt, storeChecks, userChecks } from "../middlewares";

router.get("/", authJwt.verifyToken, storesCtrl.getStores);

router.get("/:storeId", authJwt.verifyToken, storesCtrl.getStoreById);

router.post(
  "/createStore",
  [ authJwt.verifyToken, authJwt.isAdminMaster, storeChecks.checkStoreExisted],
  storesCtrl.createStore
);
  
router.put(
  "/:storeId",
  [authJwt.verifyToken, authJwt.isAdminMaster],
  storesCtrl.updateStoreById
);
  
router.delete(
  "/:storeId",
  [authJwt.verifyToken, authJwt.isAdminMaster],
  storesCtrl.deleteStoreById
);

export default router;