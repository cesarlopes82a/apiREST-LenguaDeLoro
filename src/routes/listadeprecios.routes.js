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


router.post(
  "/setDefaultStoreLDP/:itemMenuSeleccionadoId",
  [ authJwt.verifyToken, [authJwt.isAdminMaster || authJwt.isAdminGlobal || authJwt.isAdminTienda] ],
  listadpCtrl.setDefaultStoreLDP
);

router.delete(
  "/eliminarListaDP",
  [authJwt.verifyToken, [authJwt.isAdminMaster || authJwt.isAdminGlobal || authJwt.isAdminTienda]],
  listadpCtrl.eliminarListaDP
);



export default router;