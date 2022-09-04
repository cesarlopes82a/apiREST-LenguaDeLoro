import jwt from "jsonwebtoken";
import config from "../config";
import User from "../models/User";
import Role from "../models/Role";

import * as userconnection from "../libs/globalConnectionStack"

export const verifyToken = async (req, res, next) => {

  console.log("vengo a verificar el token")
  let token = req.headers["x-access-token"];

  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, config.SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    console.log("decoded.id: -> " + decoded.id)
    console.log("decoded.email: -> " + decoded.email)

    const userFoundByEmail = await User.findOne({ email: req.userEmail });
    if (!userFoundByEmail) return res.status(404).json({ message: "Email: " + req.userEmail + " not found" });

    req.userDB = userFoundByEmail._id
    console.log("llego aca")
    //if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
     // await userconnection.checkandcreateUserConnectionStack(dbuserid);
    //}
    console.log("llego aca2")
    
    //const userFound = await User.findById(req.userId, { password: 0 });
    //if (!userFound) return res.status(404).json({ message: "No user found" });


    console.log("me voy de verificar el token")
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorizedd!" });
  }
};

export const isModerator = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const roles = await Role.find({ _id: { $in: user.roles } });

    for (let i = 0; i < roles.length; i++) {
      if (roles[i].roleName === "moderator") {
        next();
        return;
      }
    }

    return res.status(403).json({ message: "Require Moderator Role!" });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: error });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    const roles = await Role.find({ _id: { $in: user.roles } });

    for (let i = 0; i < roles.length; i++) {
      if (roles[i].roleName === "admin") {
        next();
        return;
      }
    }

    return res.status(403).json({ message: "Require Admin Role!" });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: error });
  }
};

export const isAdminMaster = async (req, res, next) => {
  try {
    // el req.userId lo se setea al momento de verificar el token

    await userconnection.checkandcreateUserConnectionStack(req.userDB);
    const user = await config.globalConnectionStack[req.userDB].user.findById(req.userId);
    if(!user) return res.status(403).json({ message: "User " + req.userDB + " not found for " + req.userDB + " database" });
    
    const roles = await config.globalConnectionStack[req.userDB].role.find({ _id: { $in: user.roles } });
    
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].roleName === "adminMaster" || roles[i].roleName === "adminGlobal") {
        next();
        return;
      }
    }

    return false
    //return res.status(403).json({ message: "Require adminMaster Role!" });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: error });
  }
};

export const isAdminGlobal = async (req, res, next) => {
  try {
    await userconnection.checkandcreateUserConnectionStack(req.userDB);
    const user = await config.globalConnectionStack[req.userDB].user.findById(req.userId);
    if(!user) return res.status(403).json({ message: "User " + req.userDB + " not found for " + req.userDB + " database" });
    
    const roles = await config.globalConnectionStack[req.userDB].role.find({ _id: { $in: user.roles } });
    
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].roleName === "adminGlobal") {
        next();
        return;
      }
    }
    return res.status(403).json({ message: "Require adminGlobal Role!" });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: error });
  }
};
export const isAdminTienda = async (req, res, next) => {
  try {
    await userconnection.checkandcreateUserConnectionStack(req.userDB);
    const user = await config.globalConnectionStack[req.userDB].user.findById(req.userId);
    if(!user) return res.status(403).json({ message: "User " + req.userDB + " not found for " + req.userDB + " database" });
    
    const roles = await config.globalConnectionStack[req.userDB].role.find({ _id: { $in: user.roles } });
    
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].roleName === "adminTienda") {
        next();
        return;
      }
    }
    return res.status(403).json({ message: "Require adminTienda Role!" });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: error });
  }
};

export const isAdminMasterGlobalOrTienda = async (req, res, next) => {
  try {
    // el req.userId lo se setea al momento de verificar el token
    console.log("el req.userId: " + req.userId)
    console.log("el req.userDB: " + req.userDB)
    await userconnection.checkandcreateUserConnectionStack(req.userDB);
    const user = await config.globalConnectionStack[req.userDB].user.findById(req.userId);
    if(!user) return res.status(403).json({ message: "User " + req.userDB + " not found for " + req.userDB + " database" });
    
    const roles = await config.globalConnectionStack[req.userDB].role.find({ _id: { $in: user.roles } });
    
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].roleName === "adminMaster" || roles[i].roleName === "adminGlobal" || roles[i].roleName === "adminTienda" ) {
        next();
        return;
      }
    }

    return res.status(403).json({ message: "Require adminMaster, adminGlobal or adminTienda Role!" });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: error });
  }
};
