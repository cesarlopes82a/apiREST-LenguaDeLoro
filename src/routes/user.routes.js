import { Router } from "express";
const router = Router();

import * as usersCtrl from "../controllers/user.controller";
import { authJwt, verifySignup, branchChecks, userChecks, storeChecks } from "../middlewares";



router.post(
  "/createUser",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster,
    verifySignup.checkDuplicateUsernameInUserDB,
  ],
  usersCtrl.createUser
);

router.post(
  "/createAdminTiendaUser",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster,
    verifySignup.checkDuplicateUsernameInUserDB,
  ],
  usersCtrl.createAdminTiendaUser
);
router.post(
  "/createVendedorUser",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster,
    verifySignup.checkDuplicateUsernameInUserDB,
  ],
  usersCtrl.createVendedorUser
);

router.get("/", [authJwt.verifyToken], usersCtrl.getUsers);

router.get("/all", [authJwt.verifyToken], usersCtrl.getUsersAndPopulate);

router.get("/userI/:userId", [authJwt.verifyToken], usersCtrl.getUserById);

router.get("/userIdPopulateStores/:userId", [authJwt.verifyToken], usersCtrl.getUserByIdAndPopulateStores);

router.get("/userN/:userName", usersCtrl.getUserByuserName);

router.get("/:storeId", [authJwt.verifyToken],usersCtrl.getUsersByStoreId);

router.post(
  "/addUserStoreByID",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster
  ],
  usersCtrl.addUserStoreByID
);
router.post(
  "/addStoreToUserFromRoute",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster
  ],
  usersCtrl.addStoreToUserFromRoute
);
router.post(
  "/addBranchToUserFromRoute",
  [
    authJwt.verifyToken,
    authJwt.isAdminMaster,
    storeChecks.checkBranchBelongsToStore,
    userChecks.checkBranchNoAddedtoUser,
    userChecks.checkStoreIsAddedToUser
  ],
  usersCtrl.addBranchToUserFromRoute
);


export default router;
