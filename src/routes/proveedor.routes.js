import { Router } from "express";
const router = Router();

import * as proveedorCtrl from "../controllers/proveedor.controller";
import { authJwt } from "../middlewares";

router.get("/", [authJwt.verifyToken], proveedorCtrl.getProveedores);

router.get("/:proveedorId",[authJwt.verifyToken], proveedorCtrl.getProveedorById);

router.post(
  "/createProveedor",
  [authJwt.verifyToken],
  proveedorCtrl.createProveedor
);

router.post(
  "/updateProveedor/:proveedorId",
  [ authJwt.verifyToken, authJwt.isAdminMaster ],
  proveedorCtrl.postUpdateProveedor
);

export default router;

