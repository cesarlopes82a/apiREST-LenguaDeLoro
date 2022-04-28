import { Router } from "express";
const router = Router();

import * as categoriesCtrl from "../controllers/category.controller";
import { authJwt } from "../middlewares";

router.get("/", authJwt.verifyToken, categoriesCtrl.getCategories);

export default router;