import jwt from "jsonwebtoken";
import config from "../config";
import User from "../models/User";
import Role from "../models/Role";

export const verifyToken = async (req, res, next) => {
  console.log("vengo a verificar el token")
  let token = req.headers["x-access-token"];

  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, config.SECRET);
    req.userId = decoded.id;

    const userFound = await User.findById(req.userId, { password: 0 });
    if (!userFound) return res.status(404).json({ message: "No user found" });


    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized!" });
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
    const user = await User.findById(req.userId);
    const roles = await Role.find({ _id: { $in: user.roles } });
    
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].roleName === "adminMaster") {
        next();
        return;
      }
    }

    return res.status(403).json({ message: "Require adminMaster Role!" });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: error });
  }
};

