import { Router } from "express";
const router = Router();

import * as ventasCtrl from "../controllers/ventas.controller";
import { authJwt } from "../middlewares";

router.get("/", [authJwt.verifyToken], ventasCtrl.getVentas);

router.get("/sttVtas1/Info/", [authJwt.verifyToken], ventasCtrl.getVentasForStatistics1);

router.get("/sttVtas2/Info/", [authJwt.verifyToken],ventasCtrl.getVentasForStatisticsPorSucursal)

router.get("/:branchId", [authJwt.verifyToken], ventasCtrl.getVentasByBranch);

router.get("/:branchId/Info", [authJwt.verifyToken], ventasCtrl.getVentasByBranchAndPopulateInfo);

router.post(
  "/registrarVenta",
  [authJwt.verifyToken],
  ventasCtrl.registrarVenta
);




export default router;