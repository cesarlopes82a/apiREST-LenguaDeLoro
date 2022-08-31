import { Router } from "express";
import * as imagesCtrl from "../controllers/images.controller";
const router = Router();

router.get("/compras/:image", imagesCtrl.getImageCompras);

router.get("/categorias/:image", imagesCtrl.getImageCategorias);

router.get("/estadisticas/:image", imagesCtrl.getImageEstadisticas);

router.get("/listadeprecios/:image", imagesCtrl.getImageListaDePrecios);

router.get("/nuevasucursal/:image", imagesCtrl.getImageNuevaSucursal);

router.get("/productos/:image", imagesCtrl.getImageProductos);

router.get("/stock/:image", imagesCtrl.getImageStock);

router.get("/sucursales/:image", imagesCtrl.getImageSucursales);

router.get("/usuarios/:image", imagesCtrl.getImageUsuarios);

router.get("/vendedores/:image", imagesCtrl.getImageVendedores);

router.get("/ventas/:image", imagesCtrl.getImageVentas);


export default router;