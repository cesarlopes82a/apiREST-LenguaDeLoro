// aca vengo cuando hago los pedidos http

import User from "../models/User";
import Role from "../models/Role";
import * as userconnection from "../libs/globalConnectionStack";

import jwt from "jsonwebtoken";
import config from "../config";

// funciones para REGISTRARSE en la aplicacion
export const signUp = async (req, res) => {
  console.log("singUp: vamos a registrar un nuevo usuario y crear una DB para sus tiendas")
  //aca creamos un nuevo usuario en la DB apilenguadeloro el _ID De este usuario va a ser el nombre de su propisa DB
  try {
    // Getting the Request Body
    const { username, email, password } = req.body;
 
    // Creating a new User Object
    const newUser = new User({
      username,
      email,
      password: await User.encryptPassword(password),
    });

    // asignamos el adminMaster Role. es una nueva DB
    const role = await Role.findOne({ roleName: "adminMaster" });
    newUser.roles = [role._id];
 
    // Saving the User Object in Mongodb apilenguadeloro
    const savedUser = await newUser.save();
    // Create a token
    const token = jwt.sign({ id: savedUser._id, email: savedUser.email, userDB: savedUser._id, role: "adminMaster", username: username }, config.SECRET, {
      expiresIn: 86400, // 24 hours
    });

    //Ahora voy a crear la db del usuario
    try {
      //creo los roles por defecto
      console.log("Estoy creando una nueva DB para " + email +": "+savedUser._id )
      console.log("voy a crear los roles por defecto...  userconnection.createRolesDB(savedUser._id)")
      await userconnection.createRolesDB(savedUser._id)
      console.log("voy a crear las categorias por defecto...  userconnection.createCategoriasDB(savedUser._id)")
      await userconnection.createCategoriasDB(savedUser._id)
    } catch (error) {
      console.log(error);
      return res.status(401).json({
        token: null,
        message: "Error creating roles in user db",
      });
    }

    try {
      await userconnection.createAdminMasterUser(savedUser._id,["adminMaster"]);
      return res.status(200).json({ token });  // este es el token que tengo que guardar en el frontend para poder acceder a las rutas que lo requieran 
    } catch (error) {
      console.log(error);
      return res.status(401).json({
        token: null,
        message: "Error creating adminMaster in user db",
      });
    }

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
    const userFound = await User.findOne({ email: email }).populate(  
      "roles"
    ); // Con el polulate trae todo el objeto del rol en lugar de solo traer el id
    if (!userFound) return res.status(400).json({ message: "User " + email + " Not Found in global DB" });


    //aca me voy a fijar si existe el usuario que intenta loguearse en la db del adminMaster
    await userconnection.checkandcreateUserConnectionStack(userFound._id);

    const userFoundInDBuser = await config.globalConnectionStack[userFound._id].user.findOne({ username: userName }).populate("roles");
    if(!userFoundInDBuser) return res.status(400).json({ message: "User " + userName + " Not Found in " + email + " database" });

      console.log("--------------")
      console.log(password + " - " + userFoundInDBuser.password)

    const matchPassword = await config.globalConnectionStack[userFound._id].user.comparePassword(
      password,
      userFoundInDBuser.password
    );
    if (!matchPassword) return res.status(401).json({
      token: null,
      message: "Invalid Password",
    });

    //VERIFICO SI LA CUENTA NO HA SIDO DESACTIVADA
    if(userFoundInDBuser.activated == false){
      console.log("WARNING: User Login Unauthorized! (deactivated) - userName: " + userName + " - adminMasterDBuser: " + userFoundInDBuser.adminMasterDBuser)
      return res.status(401).json("WARNING: User Login Unauthorized! (deactivated) - userName: " + userName + " - adminMasterDBuser: " + userFoundInDBuser.adminMasterDBuser);
    }
    


    //console.log("ESTO ES EL ROLE QUE CARGARIA EN EL TOKEN: " + userFoundInDBuser.roles[0].roleName)
    const token = jwt.sign({ id:userFoundInDBuser._id, email: userFound.email, userDB: userFound._id, role: userFoundInDBuser.roles[0].roleName, username:userName}, config.SECRET, {
      expiresIn: 86400, // 24 hours
    });

    //esto creo que es al pedo
    const dbuserid = userFound._id
    if(dbuserid){
      if(!userFound.adminMasterDBuser){ 
        await userconnection.createAdminMasterUser(dbuserid,["adminMaster"])
      }
      if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
      }
    }

    res.json({ token });
  } catch (error) {
    console.log(error);
  }
};
