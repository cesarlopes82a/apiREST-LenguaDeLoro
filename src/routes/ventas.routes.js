import { Router } from "express";
const router = Router();

import * as ventasCtrl from "../controllers/ventas.controller";
import { authJwt } from "../middlewares";

router.get("/", [authJwt.verifyToken], ventasCtrl.getVentas);

router.get("/:branchId", [authJwt.verifyToken], ventasCtrl.getVentasByBranch);

router.get("/:branchId/Info", [authJwt.verifyToken], ventasCtrl.getVentasByBranchAndPopulateInfo);

router.post(
  "/registrarVenta",
  [authJwt.verifyToken],
  ventasCtrl.registrarVenta
);

export default router;