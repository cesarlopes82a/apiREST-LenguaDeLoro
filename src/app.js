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
import usersRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";

import User from "./models/User";
import Role from "./models/Role";
import Store from "./models/Store";
import Branch from "./models/Branch";

import { createRoles, createAdmin} from "./libs/initialSetup";




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

app.use(function(req, res, next) {
  //este middleware se ejecuta cada vez que hay un req a la app. aca defino que DB voy a usar
  //me fijo si tengo que escribir en la DB global o la del usuario
  //la coneccion global esta siempre escuchando(se inicia con el database.js) asi que por ahora no uso la coneccion global desde aca.
  const { dbuserid } = req.body;
  if(dbuserid){
    if(dbuserid == "global"){
      var connection_uri = `${config.MONGODB_URI}`
    } else{
        var connection_uri = `${config.MONGODB_URI_URL}${dbuserid}`
    }

    //initiating one time unique connection 
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
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);



export default app;
