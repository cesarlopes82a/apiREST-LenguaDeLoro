import config from "../config"
import mongoose from "mongoose";
import User from "../models/User";
import Role from "../models/Role";
import Store from "../models/Store";
import Branch from "../models/Branch";
import Category from "../models/Category";
import Product from "../models/Product";
import Proveedor from "../models/Proveedor";
import Compra from "../models/Compra";
import ListaDePrecios from "../models/ListaDePrecios";
import * as categoryCtrl from "../controllers/category.controller";

import { use } from "passport";


export const checkandcreateUserConnectionStack = (dbuserid) => {
if(dbuserid){
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        if(dbuserid == "global"){
        var connection_uri = `${config.MONGODB_URI}`
        } else{
            var connection_uri = `${config.MONGODB_URI_URL}${dbuserid}`
        }

        //initiating one time unique connection 
        if(connection_uri){
            config.globalConnectionStack[dbuserid] = {};
            config.globalConnectionStack[dbuserid].db = mongoose.createConnection(connection_uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
            });
            
            config.globalConnectionStack[dbuserid].user = config.globalConnectionStack[dbuserid].db.model('User',User.userSchema);
            config.globalConnectionStack[dbuserid].role = config.globalConnectionStack[dbuserid].db.model('Role',Role.roleSchema);
            config.globalConnectionStack[dbuserid].store = config.globalConnectionStack[dbuserid].db.model('Store',Store.storeSchema);
            config.globalConnectionStack[dbuserid].branch = config.globalConnectionStack[dbuserid].db.model('Branch',Branch.branchSchema);
            config.globalConnectionStack[dbuserid].category = config.globalConnectionStack[dbuserid].db.model('Category',Category.categorySchema);
            config.globalConnectionStack[dbuserid].product = config.globalConnectionStack[dbuserid].db.model('Product',Product.productSchema);
            config.globalConnectionStack[dbuserid].proveedor = config.globalConnectionStack[dbuserid].db.model('Proveedor',Proveedor.productSchema);
            config.globalConnectionStack[dbuserid].compra = config.globalConnectionStack[dbuserid].db.model('Compra',Compra.compraSchema);
            config.globalConnectionStack[dbuserid].listadeprecios = config.globalConnectionStack[dbuserid].db.model('ListaDePrecios',ListaDePrecios.compraSchema);

        }
    }
  }
}

export const createAdminMasterUser = async (dbuserid,roles) => {
    //esta funcion la llamo cuando creo una DB nueva (singup). Creo un adminMaster dentro de la DB dbuserid
    if(!dbuserid)return res.status(400).json({ message: "dbuserid expected" });

    if(!roles)return res.status(400).json({ message: "role expected" });

    //verifico el formato del dbuserid
    if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/))return res.status(400).json({ message: "Invalid user ID: " + dbuserid });
    
    const userFound = await User.findById(dbuserid); //me fijo si existe el usuario en DB Global
    if(!userFound){
      return res.status(401).json({
        message: "(76788)User " + dbuserid + " not found in global DB",
      });
    }
     
    //Me fijo si ya tengo cargado el stack de coneccion y si no esta cargado, lo cargo    
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        console.log("creo el stack de coneccion para poder crear la db del usuario")
        await checkandcreateUserConnectionStack(dbuserid);
    }

    // creo el nuevo usuario adminMaster
    const newUserDB = new config.globalConnectionStack[dbuserid].user({
        username: userFound.username,
        email: userFound.email,
        password: userFound.password,
        adminMasterDBuser: String(dbuserid),
    });
    if(!newUserDB){
        return res.status(401).json({
            token: null,
            message: "Unable to create user db",
        });
    }

    // checking for roles. con esto reviso si existe el rol que me estan pasando para crear el usuario
    if (roles) {
        const foundRoles = await config.globalConnectionStack[dbuserid].role.find({ roleName: { $in: roles } });
        newUserDB.roles = foundRoles.map((role) => role._id);
    } else { //si no me pasa ningun rol le asigno el rol por defecto
        const role = await config.globalConnectionStack[dbuserid].role.findOne({ roleName: "vendedor" });
        newUserDB.roles = [role._id];
    }
 
    //guardo el nuevo usuario en la DB 
    const newUserDBSaved = await newUserDB.save();
    if(!newUserDBSaved){
        return res.status(401).json({
            token: null,
            message: "Unable to save user db",
        });
    }

    // actualizo la DB Global con id a la DB del usuario
    userFound.adminMasterDBuser = newUserDBSaved._id
    const updatedUser = await User.findByIdAndUpdate(
        userFound._id,
        userFound,
        {
        new: true,
        }
    );  
    if(!updatedUser){
        return res.status(401).json({
            token: null,
            message: "Unable to update global user db",
        });
    }
    return updatedUser;
}
    

export const createRolesDB = async (dbuserid) => {
    console.log("vengo a crear los roles para la db del usuario")
    try {
        if(!dbuserid)return res.status(400).json({ message: "dbuserid expected" });

        //verifico el formato del dbuserid
        if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/))return res.status(400).json({ message: "Invalid user ID: " + dbuserid });

        //Me fijo si ya tengo cargado el stack de coneccion y si no esta cargado, lo cargo    
        if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
            console.log("creo el stack de coneccion al intentar crear los roles")
            checkandcreateUserConnectionStack(dbuserid);
        }
        // Count Documents
        const count = await config.globalConnectionStack[dbuserid].role.estimatedDocumentCount();
    
        // check for existing roles
        if (count > 0) return;
    
        // Create default Roles
        const values = await Promise.all([
          new config.globalConnectionStack[dbuserid].role({ roleName: "adminMaster" }).save(),
          new config.globalConnectionStack[dbuserid].role({ roleName: "adminGlobal" }).save(),
          new config.globalConnectionStack[dbuserid].role({ roleName: "adminTienda" }).save(),
          new config.globalConnectionStack[dbuserid].role({ roleName: "vendedor" }).save(),
          
        ]);
    
        console.log(values);
      } catch (error) {
        console.error(error);
      }

}
export const createCategoriasDB = async (dbuserid) => {
    console.log("vengo a crear las categorias por defecto para la db del usuario")
    try {
        if(!dbuserid)return res.status(400).json({ message: "dbuserid expected" });

        //verifico el formato del dbuserid
        if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/))return res.status(400).json({ message: "Invalid user ID: " + dbuserid });

        //Me fijo si ya tengo cargado el stack de coneccion y si no esta cargado, lo cargo    
        if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
            console.log("creo el stack de coneccion al intentar crear las categorias")
            checkandcreateUserConnectionStack(dbuserid);
        }
        // Count Documents
        const count = await config.globalConnectionStack[dbuserid].category.estimatedDocumentCount();
    
        // check for existing categories
        if (count > 0) return;
    
        // Create default Categoties
        categoryCtrl.createCategory(dbuserid, "Alimentos secos")
        categoryCtrl.createCategory(dbuserid, "Fiambres")
        categoryCtrl.createCategory(dbuserid, "Golocinas")
        categoryCtrl.createCategory(dbuserid, "Bebidas con alcohol")
        categoryCtrl.createCategory(dbuserid, "Bebidas sin alcohol")
        categoryCtrl.createCategory(dbuserid, "Articulos de tocador")
        categoryCtrl.createCategory(dbuserid, "Articulos de limpieza")
      } catch (error) {
        console.error(error);
      }

}


