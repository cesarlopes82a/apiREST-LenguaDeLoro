import { Router } from "express";
const router = Router();

import * as proveedorCtrl from "../controllers/proveedor.controller";
import { authJwt } from "../middlewares";

router.get("/", [authJwt.verifyToken], proveedorCtrl.getProveedores);

router.post(
  "/createProveedor",
  [authJwt.verifyToken],
  proveedorCtrl.createProveedor
);

export default router;