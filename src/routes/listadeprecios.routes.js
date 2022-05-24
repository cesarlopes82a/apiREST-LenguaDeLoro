import { Router } from "express";
const router = Router();

import * as listadpCtrl from "../controllers/listadeprecios.controller";
import { authJwt } from "../middlewares";



router.get("/", [authJwt.verifyToken], listadpCtrl.getListasDPsByStoreId);

router.get("/:listaId", [authJwt.verifyToken], listadpCtrl.getListaDpByIdAndPopulateProducts);

router.get("/store/:storeId",[authJwt.verifyToken], listadpCtrl.getListasdpByStoreIdAndPopulateInfo);

router.post(
  "/registrarLDP",
  [authJwt.verifyToken],
  listadpCtrl.registrarNuevaLDP
);





export default router;