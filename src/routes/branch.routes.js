import { Router } from "express";
const router = Router();

import * as branchCtrl from "../controllers/branch.controller";
import { authJwt, branchChecks } from "../middlewares";

router.get("/", branchCtrl.getBranches);

router.get("/:branchId", authJwt.verifyToken, authJwt.isAdminMaster, branchCtrl.getBranchById);

router.get("/stock/:branchId", authJwt.verifyToken, authJwt.isAdminMaster, branchCtrl.getStockByBranchId);

router.get("/bystoreId/:storeId", authJwt.verifyToken, authJwt.isAdminMaster, branchCtrl.getBranchesByStoreId);

router.post(
  "/createBranch",
  [ authJwt.verifyToken, authJwt.isAdminMaster, branchChecks.checkBranchNameExistsInStore],
  branchCtrl.createBranch
);
  
router.put(
  "/:branchId",
  [authJwt.verifyToken, authJwt.isAdminMaster],
  branchCtrl.updateBranchById
);
  
router.delete(
  "/:branchId",
  [authJwt.verifyToken, authJwt.isAdminMaster],
  branchCtrl.deleteBranchById
);


export default router;