// aca vengo cuando hago los pedidos http

import mongoose from "mongoose";
import User from "../models/User";
import Role from "../models/Role";
import Store from "../models/Store";
import Branch from "../models/Branch";
import * as userconnection from "../libs/globalConnectionStack";

import jwt from "jsonwebtoken";
import config from "../config";

// funciones para registrarse en la aplicacion
export const signUp = async (req, res) => {
  try {
    // Getting the Request Body
    const { username, email, password, roles } = req.body;
    // Creating a new User Object
    const newUser = new User({
      username,
      email,
      password: await User.encryptPassword(password),
    });

    // checking for roles. con esto reviso si existe el rol que me estan pasando para crear el usuario
    if (req.body.roles) {
      const foundRoles = await Role.find({ roleName: { $in: roles } });
      newUser.roles = foundRoles.map((role) => role._id);
    } else { //si no me pasa ningun rol le asigno el rol por defecto
      const role = await Role.findOne({ roleName: "adminMaster" });
      newUser.roles = [role._id];
    }

    // Saving the User Object in Mongodb
    const savedUser = await newUser.save();
    // Create a token
    const token = jwt.sign({ id: savedUser._id }, config.SECRET, {
      expiresIn: 86400, // 24 hours
    });

    if(userconnection.createUserDB(savedUser)){
      return res.status(200).json({ token });  // este es el token que tengo que guardar en el frontend para poder acceder a las rutas que lo requieran 
    }else{
      return res.status(401).json({
        token: null,
        message: "Error creating user db",
      });
    };
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};


// funciones para LOGUEARSE en la aplicacion
export const signin = async (req, res) => {
  try {
    const { userName, email, password} = req.body;
    if(!userName) return res.status(401).json({
      token: null,
      message: "No user name sent",
    });
    if(!email) return res.status(401).json({
      token: null,
      message: "No user email sent",
    });
    if(!password) return res.status(401).json({
      token: null,
      message: "No user password sent",
    });
    
    // Request body email can be an email or username
    const userFound = await User.findOne({ email: email }).populate(  // Con el polulate trae todo el objeto del rol en lugar de solo traer el id
      "roles"
    );
    if (!userFound) return res.status(400).json({ message: "User Not Found" });

    if(userFound.username != userName || userFound.email != email) return res.status(401).json({
      token: null,
      message: "User name / email mismatched",
    });

    const matchPassword = await User.comparePassword(
      req.body.password,
      userFound.password
    );

    if (!matchPassword)
      return res.status(401).json({
        token: null,
        message: "Invalid Password",
      });

    const token = jwt.sign({ id: userFound._id }, config.SECRET, {
      expiresIn: 86400, // 24 hours
    });

    const dbuserid = userFound._id
    if(dbuserid){
      if(!userFound.adminMasterDBuser){ 
        userconnection.createUserDB(dbuserid)
      }
      if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        userconnection.createUserConnectionStack(dbuserid);
      }
    }

    res.json({ token });
  } catch (error) {
    console.log(error);
  }
};
