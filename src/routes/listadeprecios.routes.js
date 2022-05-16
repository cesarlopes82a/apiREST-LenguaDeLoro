import { Router } from "express";
const router = Router();

import * as listadpCtrl from "../controllers/listadeprecios.controller";
import { authJwt } from "../middlewares";



router.get("/", [authJwt.verifyToken], listadpCtrl.getListasDPsByStoreId);



router.post(
  "/registrarLDP",
  [authJwt.verifyToken],
  listadpCtrl.createLDPs
);

export default router;