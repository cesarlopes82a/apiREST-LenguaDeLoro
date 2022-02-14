import User from "../models/User";
import config from "../config";
import * as userconnection from "../libs/globalConnectionStack";


export const createUser = async (req, res) => {
  const dbuserid = req.userDB
  try {
    console.log("vamos a crear el user")
    const { username, password, roles} = req.body;

    if(!username) return res.status(401).json({ message: "User name expected" });
   // if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });
    if(!password) return res.status(401).json({ message: "password expected" });

    //voy a buscar el dbuserid en la DB porque necesito conocer su email
    const userFound = await User.findById(dbuserid); //me fijo si existe el usuario en DB Global
    if(!userFound){
      return res.status(401).json({
        message: "User " + req.userDB + " not found in global DB",
      });
    }

    // creating a new User in db adminMaster user
    const newUser = await new config.globalConnectionStack[dbuserid].user({
      username,
      email: req.userEmail,
      password: password,
      adminMasterDBuser: dbuserid,
    });

    //aca verifico si me estan pasando roles. si me pasan algun rol, luego voy a mapear solo el id
    if (roles) {
      const foundRoles = await config.globalConnectionStack[dbuserid].role.find({ roleName: { $in: roles } });
      newUser.roles = foundRoles.map((role) => role._id);
    } else { //si no me pasa ningun rol le asigno el rol por defecto
      const role = await config.globalConnectionStack[dbuserid].role.findOne({ roleName: "vendedor" });
      newUser.roles = [role._id];
    }

    // encrypting password
    newUser.password = await config.globalConnectionStack[dbuserid].user.encryptPassword(newUser.password);

    // saving the new user
    const savedUser = await newUser.save();
    
    return res.status(200).json({
      _id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      roles: savedUser.roles,
    });
  } catch (error) {
    console.error(error);
  }
};

export const getUserById = async (req, res) => {
  const  userId = req.params.userId;
  const dbuserid = req.userDB

  console.log("el user id " + userId)

  if (!userId) return res.status(403).json({ message: "No user ID provided" });
  if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });

  try {
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    if(!userFound) return res.status(401).json({
      message: "User " + userId + " not found for DB " + dbuserid ,
    });
    res.status(200).json(userFound);
  } catch (error) {
    console.log("Error al intentar obtener userById");
    console.log(error);
  }

};

export const getUserByIdAndPopulateStores = async (req, res) => {
  console.log("getUserByIdAndPopulateStores")
  const  userId = req.params.userId;
  const dbuserid = req.userDB

  console.log("el user id " + userId)
  console.log("el dbuserid " + dbuserid)

  if (!userId) return res.status(403).json({ message: "No user ID provided" });
  if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });

  try {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
    .populate("roles")
    .populate("tiendas.store")
    .populate("tiendas.branches");

    if(!userFound) return res.status(401).json({
      message: "User " + userId + " not found for DB " + dbuserid ,
    });
    res.status(200).json(userFound);
  } catch (error) {
    console.log("Error al intentar obtener userById");
    console.log(error);
  }

};

export const updateUserById = async (req, res) => {  //ojo con esto. no enviar el password!!! actualizarlo de otra forma!!
  try {
    const { userId } = req.params;  //se usa el req.params porque viene el id en la barra de direccion.
    const updatedUser = await User.findByIdAndUpdate(
    userId,
    req.body,
    {
      new: true,  // esto es para que me devuelva el objeto actualizado. por defecto me devuelve el objeto viejo(antes del update)
    }
  );
  res.status(204).json(updatedUser);
  } catch (error) {
    console.error(error);
  }
  
};

export const getUsers = async (req, res) => {
  console.log("vengo a buscar todos los userss");

  const dbuserid = req.userDB;
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  
  const usersFound = await config.globalConnectionStack[dbuserid].user.find();
  res.status(200).json(usersFound);
};

export const getUserByuserName = async (req, res) => {
  console.log("vengo a buscar user By userName");
  
  const { dbuserid } = req.body;
  const { userName } = req.params;
  console.log(userName);
  if(!userName) return res.status(401).json({ message: "userName expected" });
  if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });
  
  try {
    const userFound = await config.globalConnectionStack[dbuserid].user.findOne({username:String(userName)});
    if(!userFound) return res.status(401).json({
      message: "User " + userName + " not found for DB " + dbuserid ,
    });
    res.status(200).json(userFound);
  } catch (error) {
    console.log("Error al intentar obtener UserByuserName");
    console.log(error);
  }
  
};

// con este metodo atacho una store a un user en la dbuser
//borrar
export const addUserStoreByID = async (req, res) => {
  console.log("vengo a agregar la tienda al perfil del user ")
  try {
    console.log("el req.userId " + req.userId)
    let { storeId, userId } = req.body;
    //si no me llega un userId en el body intento asignarle el req.userId(este caso se da cuando se crea una nueva tienda entonces...
    // el req.userId es el adminMaster que acaba de crear una tienda)
    if(!userId) {
      userId = req.userId
    }
    
    const dbuserid = req.userDB
    if(!storeId) return res.status(401).json({ message: "No storeId received" });
    if(!userId) return res.status(401).json({ message: "No userId received" }); //esta variable userId deberia venir de cuando verificamos el token en el middleware
    if(!dbuserid) return res.status(401).json({ message: "No dbuserid received" });

      await userconnection.checkandcreateUserConnectionStack(dbuserid);
      //Verifico si existe la tienda en la db del user
      const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
      if(!storeFound) return res.status(401).json({ message: "Store not found" });

      //Verifico si existe el usuario en la db del user
      const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
      if(!userFound) return res.status(401).json({ message: "User not found" });


      //la tienda existe y el usuario tambien. ahora voy a ver si el usuario ya tiene asociada la tienda
      const stores = await config.globalConnectionStack[dbuserid].store.find({ _id: { $in: userFound.stores } });
      for (let i = 0; i < stores.length; i++) {
        if (stores[i]._id == storeId) {
          return res.status(401).json({ message: "Store already added to this user" });;     
        }
      }

      //El usuario no tiene atachada la tienda. se la agrego y actualizo la db del user
      userFound.stores.push(storeId)
      const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
        userId,
        userFound,
        {
          new: true,
        }
      )
      res.status(204).json(updatedUser);
   
  } catch (error) {
    console.error(error);
  }
};

export const addUserBranchByID = async (req, res) => {
  console.log("vengo a agregar la branch al perfil del user ")
  
  try {
    console.log(req.body)
    let { storeId, branchId, userId } = req.body;
    console.log("este es el userId desde el body " + userId)
    //si no me llega un userId en el body intento asignarle el req.userId(este caso se da cuando se crea una nueva branch entonces...
    // el req.userId es el adminMaster que acaba de crear una tienda)
    if(!userId) {
      userId = req.userId
    }
    
    const dbuserid = req.userDB
    if(!storeId) return res.status(401).json({ message: "No storeId received" });
    if(!branchId) return res.status(401).json({ message: "No branchId received" });
    if(!userId) return res.status(401).json({ message: "No userId received" }); //esta variable userId deberia venir de cuando verificamos el token en el middleware
    if(!dbuserid) return res.status(401).json({ message: "No dbuserid received" });

    try {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);

      //Verifico si existe la tienda en la db del user
      const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
      if(!storeFound) return res.status(401).json({ message: "Store not found" });
      
      //Verifico si existe el usuario en la db del user
      const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
      if(!userFound) return res.status(401).json({ message: "User not found" });

      //Verifico si existe la branch en la db del user 
      const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(userId);
      if(!branchFound) return res.status(401).json({ message: "Branch not found" });


      //la tienda, la branch y el user tambien. ahora voy a ver si el usuario ya tiene asociada la branch
      const branches = await config.globalConnectionStack[dbuserid].store.find({ _id: { $in: userFound.branches } });
      for (let i = 0; i < branches.length; i++) {
        if (branches[i]._id == branchId) {
          return res.status(401).json({ message: "Branch already added to this user" });;     
        }
      }
      
      //El usuario no tiene atachada la branch. se la agrego y actualizo la db del user
      userFound.branches.push(branchId)
      const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
        userId,
        userFound,
        {
          new: true,
        }
      )
      console.log("salgo de eso2")
      res.status(204).json(updatedUser);

    } catch (error) {
      
    }
   
  } catch (error) {
    console.error(error);
  }
};


export const addStoreToUserFromRoute = async (req, res) =>{
  const dbuserid = req.userDB
  const { storeId, userId } = req.body
  const updatedUser = await addStoreToUser(dbuserid, storeId, userId);
  if(!updatedUser) res.status(401).json({ 
    message: "Unable to add new store: " + storeId + " to user id" + userId + " in " + dbuserid + " database"
  });
  res.status(204).json(updatedUser);
}

export const getUsersByStoreId = async (req, res)=>{
  try {
    console.log("vengo a buscar todos los users BY STORE ID");

    const dbuserid = req.userDB;
    const  storeId  = req.params.storeId;
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    
    // The following example queries for documents where the "tiendas" array has at least one embedded document that contains the field "store" equal to storeId 
    // busco la tienda dentro de las tiendas atachadas al user
    const usersFound = await config.globalConnectionStack[dbuserid].user.find({"tiendas.store" : storeId});
    res.status(200).json(usersFound);
 

  } catch (error) {
    console.log(error)
  }
}

export const addStoreToUser = async (dbuserid, storeId, userId) => {
  console.log("dbuserid " + dbuserid)
  console.log("storeId " + storeId)
  console.log("userId " + userId)
  try {

    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  
    //Verifico si existe el usuario en la db del user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);

    //ahora voy a ver si el usuario ya tiene asociada la store
    const stores = await config.globalConnectionStack[dbuserid].store.find({ _id: { $in: userFound.stores } });
    console.log(stores)
    for (let i = 0; i < stores.length; i++) {
      if (stores[i]._id == storeId) {
        console.log("estoy en el for")
        return message.json({ message: "storeId " + storeId + " already added to user " + userId + " in " + dbuserid + " database" });;     
      }
    }
 

    //esto es un test
      var elementoTiendas = {
      store: storeId,
    }
    userFound.tiendas.push(elementoTiendas)
    ////////////////////////////////////////////////////
    
    
    //El usuario no tiene atachada la branch. se la agrego y actualizo la db del user
    userFound.stores.push(storeId)
    const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
      userId,
      userFound,
      {
        new: true,
      }
    )
    return updatedUser;
 
  } catch (error) {
    console.log(error)
  }
}


export const addBranchToUser = async (dbuserid, storeId, branchId, userId) => {
  console.log("dbuserid " + dbuserid)
  console.log("storeId " + storeId)
  console.log("userId " + userId)
  try {

    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  
    //Verifico si existe el usuario en la db del user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    console.log(userFound)

    //ahora voy a ver si el usuario ya tiene asociada la store
    const stores = await config.globalConnectionStack[dbuserid].store.find({ _id: { $in: userFound.stores } }); 
    // para entender. userFound.stores son todas las tiendas que tiene atachado el user
    // estoy sacando todos los id de las stores y los cargo en un array para poder recorrerlo
    console.log("las stores")
    console.log(stores)

    for (let i = 0; i < stores.length; i++) {
      if (stores[i]._id == storeId) {
        //el usuario tiene la store atachada. puedo atachar la branch. primero me fijo si no la tiene atachada ya
        const branches = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: userFound.branches } }); 
        for (let j = 0; j < branches.length; j++) {
          if (branches._id == branchId) {
            //si llego aca es porque la branch ya estaba atachada. me voy
            return message.json({ message: "storeId " + storeId + " already added to user " + userId + " in " + dbuserid + " database" });;     
          }
        }
        // si sali del for sin pasar por el return, tengo que hacerle el push al arreglo y actualizar el user


        //esto es un test
        for (let i = 0; i < userFound.tiendas.length; i++) {
          console.log(userFound.tiendas[i])
          if (userFound.tiendas[i].store == storeId) {
            userFound.tiendas[i].branches.push(branchId)
          }
        }
        ////////////////////////////////////////////////////


        userFound.branches.push(branchId)
        const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
          userId,
          userFound,
          {
            new: true,
          }
        )
        console.log("el updatedUser antes de enviarlo")
        console.log(updatedUser)
        return updatedUser;
      }
    }   
 
    console.log("me voy")
  } catch (error) {
    console.log(error)
  }
}

export const addBranchToUserFromRoute = async (req, res) =>{
  const dbuserid = req.userDB
  const { storeId, branchId, userId } = req.body
  const updatedUser = await addBranchToUser(dbuserid, storeId, branchId, userId);
  console.log("el updadedUser")
  console.log(updatedUser)
  if(!updatedUser) res.status(401).json({ 
    message: "Unable to add new branch: " + branchId + " to user id" + userId + " in " + dbuserid + " database"
    })
  

  res.status(204).json(updatedUser);
}
