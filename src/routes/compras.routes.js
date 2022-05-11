import { Router } from "express";
const router = Router();

import * as compraCtrl from "../controllers/compra.controller";
import { authJwt } from "../middlewares";

router.get("/", [authJwt.verifyToken], compraCtrl.getCompras);

router.get("/:branchId", [authJwt.verifyToken], compraCtrl.getComprasByBranch);

router.get("/:branchId/Info", [authJwt.verifyToken], compraCtrl.getComprasByBranchAndPopulateInfo);

router.post(
  "/registrarCompra",
  [authJwt.verifyToken],
  compraCtrl.registrarCompra
);

export default router;