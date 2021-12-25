import { Router } from "express";
const router = Router();

import * as usersCtrl from "../controllers/user.controller";
import { authJwt, verifySignup, dbusers } from "../middlewares";

router.post(
  "/createUser",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster,
    verifySignup.checkDuplicateUsernameOrEmail,
  ],
  usersCtrl.createUser
);

router.post(
  "/addUserStoreByID",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster
  ],
  usersCtrl.addUserStoreByID
);

export default router;
