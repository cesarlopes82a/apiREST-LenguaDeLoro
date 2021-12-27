import { Router } from "express";
const router = Router();

import * as branchCtrl from "../controllers/branch.controller";
import { authJwt, branchChecks } from "../middlewares";

router.get("/", branchCtrl.getBranches);

router.get("/:branchId", branchCtrl.getBranchById);

router.post(
  "/createBranch",
  [ authJwt.verifyToken, authJwt.isAdminMaster, branchChecks.checkBranchExisted],
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