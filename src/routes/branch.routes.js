import { Router } from "express";
const router = Router();

import * as branchCtrl from "../controllers/branch.controller";
import { authJwt, branchChecks } from "../middlewares";

router.get("/", branchCtrl.getBranches);

router.get("/:branchId", authJwt.verifyToken, [ authJwt.isAdminMasterGlobalOrTienda ], branchCtrl.getBranchById);

router.get("/stock/:branchId", authJwt.verifyToken, [ authJwt.isAdminMasterGlobalOrTienda ], branchCtrl.getStockByBranchId);

router.get("/bystoreId/:storeId", authJwt.verifyToken, [ authJwt.isAdminMasterGlobalOrTienda ], branchCtrl.getBranchesByStoreId);

router.get("/bybranchId/:branchId", authJwt.verifyToken, [ authJwt.isAdminMasterGlobalOrTienda ], branchCtrl.getBranchesByBranchId);

router.post(
  "/createBranch",
  [ authJwt.verifyToken, [ authJwt.isAdminMaster || authJwt.isAdminGlobal ], branchChecks.checkBranchNameExistsInStore],
  branchCtrl.createBranch
);

router.post(
"/ajustarStock/:branchId",
[ authJwt.verifyToken, [ authJwt.isAdminMasterGlobalOrTienda ] ],
branchCtrl.ajustarStock
);
  
router.put(
  "/:branchId",
  [authJwt.verifyToken, [ authJwt.isAdminMasterGlobalOrTienda ]],
  branchCtrl.updateBranchById
);
  
router.delete(
  "/:branchId",
  [authJwt.verifyToken, [ authJwt.isAdminMasterGlobalOrTienda ]],
  branchCtrl.deleteBranchById
);


router.delete(
  "/deleteBranch/:branchId",
  [authJwt.verifyToken, authJwt.isAdminMaster],
  branchCtrl.deleteBranch
);

export default router;