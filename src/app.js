//desde caca configuro la app de expressno
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import mongoose from "mongoose";

import pkg from "../package.json";

import config from "./config";

import productRoutes from "./routes/products.routes";
import storesRoutes from "./routes/stores.routes"
import branchesRoutes from "./routes/branch.routes"
import usersRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";


import * as userconnection from "./libs/globalConnectionStack";

import { createRoles, createAdmin} from "./libs/initialSetup";
import User from "./models/User";

const app = express();  //con esto inicio el servidor del backend. aca empieza a estar viva la api
createRoles();          // lo primero que hago despues de levantar el backend es crear los roles si no exisen. Llamo la fucion desde libs/initialSetup
createAdmin();

// Settings
app.set("pkg", pkg);
app.set("port", process.env.PORT || 4000);
app.set("json spaces", 4);

// Middlewares
const corsOptions = {
  // origin: "http://localhost:3000",
};
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
console.log("cargo el app.use")

app.use (async function(req, res, next) {
  //este middleware se ejecuta cada vez que hay un req a la app. aca defino que DB voy a usar y verifico el formato del ID que me llega
  //me fijo si tengo que escribir en la DB global o la del usuario
  //la coneccion global esta siempre escuchando(se inicia con el database.js) asi que por ahora no uso la coneccion global desde aca.
  const { dbuserid } = req.body;

  if(dbuserid){
    //verifico el formato del dbuserid
    if (!dbuserid.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: "Invalid user ID: " + dbuserid });

    const userFound = await User.findById(dbuserid); //me fijo si existe el usuario en DB Global
    if(!userFound){
      return res.status(401).json({
        message: "User " + dbuserid + " not found in global DB",
      });
    }

    // el adminMasterDBuser es un indicador de que la DB del usuario está creada. si es null hay que crear la DB del usuario
    if(!userFound.adminMasterDBuser){ 
      await userconnection.createRolesDB(dbuserid);
      await userconnection.createUserDB(dbuserid,["adminMaster"]);
    }
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  return next();
});

// Welcome Routes
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to my LdL API",
    name: app.get("pkg").name,
    version: app.get("pkg").version,
    description: app.get("pkg").description,
    author: app.get("pkg").author,
  });
});

// Routes
app.use("/api/products", productRoutes);
app.use("/api/stores",storesRoutes);
app.use("/api/branches",branchesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);



export default app;
