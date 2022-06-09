import User from "../models/User";
import config from "../config";
import * as userconnection from "../libs/globalConnectionStack";
import { checkBranchNameExistsInStore } from "../middlewares/branchChecks";


export const createUser = async (req, res) => {
  const dbuserid = req.userDB
  try {
    console.log("vamos a crear el user")
    const { username, password, roles} = req.body;

    if(!username) return res.status(401).json({ message: "User name expected" });
   // if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });
    if(!password) return res.status(401).json({ message: "password expected" });

    //voy a buscar el dbuserid en la DB global porque ahí guardé el id del adminMaster
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
      adminMasterID: userFound.adminMasterDBuser
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
export const getUsersAndPopulate = async (req, res) => {
  console.log("getUserByIdAndPopulateStores")
  const dbuserid = req.userDB

  if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });

    await userconnection.checkandcreateUserConnectionStack(dbuserid);
    const usersFound = await config.globalConnectionStack[dbuserid].user.find()
    .select('-password')
    .populate("roles")
    .populate("tiendas.store")
    .populate("tiendas.branches")

    res.status(200).json(usersFound);
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

export const reasignarTiendasToUser = async (req,res) =>{
  const dbuserid = req.userDB
  const { userId, listaTiendasSeleccionadas } = req.body
  console.log("MENSAJE: reasignarTiendasToUser() - Reasignando tiendas para user: " + userId + " - dbuserid: " + dbuserid + ".")
  try {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  
    //Verifico si existe el usuario en la db del user
    console.log( "MENSAJE: obtniendo datos de usuario " + userId + " en dbuserid: " + dbuserid + "...");
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    if(!userFound){
      console.log( "ERROR(1234): NO se encuenta al usuario " + userId + " en dbuserid: " + dbuserid);
      res.status(401).json({message: "MENSAJE: userId: " + userId + " no encontrado en " + dbuserid + " database"});
    }
    console.log( "MENSAJE: usuario " + userId + " encontrado en dbuserid: " + dbuserid + ".");

    //Voy a buscar las tiendas del adminMarter
    //un usuario NO puede tener tiendas que no tenga el adminMaster. USO las tiendas del adminMaster como referencia.
    console.log( "MENSAJE: obtniendo datos de adminMaster " + userFound.adminMasterID + " en dbuserid: " + dbuserid + "...");
    const adminMasterFound = await config.globalConnectionStack[dbuserid].user.findById(userFound.adminMasterID);
    if(!adminMasterFound){
      console.log( "ERROR(4352): adminMaster user " + userFound.adminMasterID + " no encontrado en dbuserid: " + dbuserid);
      res.status(401).json({message: "MENSAJE: adminMaster user " + userFound.adminMasterID + " no encontrado en dbuserid: " + dbuserid});
    }
    console.log( "MENSAJE: adminMaster user " + userFound.adminMasterID + " encontrado en dbuserid: " + dbuserid + ".");

    //limpio el array de tiendas del user para realizar la nueva asignacion
    userFound.tiendas.splice(0, userFound.tiendas.length);

    //recorro el array de tiendas del adminMaster para ir asignando lo que corresponda
    for (let i = 0; i < adminMasterFound.tiendas.length; i++) {                            //recorro las tienda
      console.log("Inicia el proceso para esta tienda.............--------------------------------->>>>>>>>>>>>>>>>>")
      let tiendaStoreId = adminMasterFound.tiendas[i].store._id
      console.log("tiendaStoreId: " + tiendaStoreId)
      for (let ii = 0; ii < adminMasterFound.tiendas[i].branches.length; ii++){                  //recorro las branches de esta tienda
        let tiendaBranchId = adminMasterFound.tiendas[i].branches[ii]._id
        console.log("tiendaBranchId: " + tiendaBranchId)
        for (const branch in listaTiendasSeleccionadas) {                           //verifico si esta branch es una de las que tengo que asignar
          console.log(`MENSAJE: ${branch}: ${listaTiendasSeleccionadas[branch]}`);
          if(`${listaTiendasSeleccionadas[branch]}` == "true" && `${branch}` == tiendaBranchId){                                     //ENCONTRE UNA STORE QUE TENGO QUE ASIGNAR.
            console.log("trueeeeeeeeeeeeeeeeeeeeeee tengo que asignar----------------")

            let storeYaAsingadaAlUser = false 

            for (let p = 0; p < userFound.tiendas.length; p++) {                    //Me fijo si ya tengo esta store asignada al user              
              console.log(userFound.tiendas[p].store)
              if(userFound.tiendas[p].store == tiendaStoreId){
                storeYaAsingadaAlUser=true
                console.log("tengo la store adentrooooooooooooooo-----------------")
                let branchYaAsingadaAlUser = false
                for (let q = 0; q < userFound.tiendas[p].branches.length; q++) {                    //Me fijo si ya tengo esta branch asignada al user                  
                  console.log("--------->>>><<<<-----------")
                  console.log(userFound.tiendas[p].branches[q])
                  console.log("--------->>>><<<<-----------")
                  if(userFound.tiendas[p].branches[q] == tiendaBranchId){
                    branchYaAsingadaAlUser = true
                    console.log("tengo la BRANCHHHHH adentrooooooooooooooo-----------------")
                  }
                }
                if(branchYaAsingadaAlUser==false){
                  console.log("pusssshhhhh de brancheeeeeeeeeee")                  
                  userFound.tiendas[p].branches.push(tiendaBranchId)           //la store ya esta asignada asi que solo le agrego la branch al array de branches
                  console.log("MENSAJE: store found for user: " + userId + ". Atachando branch: " + tiendaBranchId + "...")
                }
                
              }
            }

            if(storeYaAsingadaAlUser==false){                                //la tienda no esta asignada asi que tengo q agregar la store y la branch
              console.log("MENSAJE: store no encontrada for user: " + userId + ". Atachando store: " + tiendaStoreId + "...")
              var elementoTiendas = {
                store: tiendaStoreId,
                branches:[]
              }
              console.log("MENSAJE: Atachando branch: " + tiendaBranchId + " to store: " + tiendaStoreId)
              console.log("pusssshhhhh de brancheeeeeeeeeee222222222 al elementoTienda")                  
              elementoTiendas.branches.push(tiendaBranchId)
              console.log("pusssshhhhh de tiendddddd")                  
              userFound.tiendas.push(elementoTiendas)              
            }   
            break         
          }
        }
      }
    }
    ///////////////////////////////////////////////////////////////////////
    // actualizamos los cambios en la db.
    console.log("MENSAJE: Acutualizando DB for user: " + userId +"...")
    const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
      userId,
      userFound,
      {
        new: true,
      }
    )
    if(!updatedUser){
      console.log( "ERROR(65454): error al actualizar la user: " + userId + " en dbuserid: " + dbuserid);
      res.status(401).json({message: "ERROR(65454): error al actualizar la user: " + userId + " en dbuserid: " + dbuserid}); 
    }
    console.log("MENSAJE: DB successfully updated for user: " + userId +".")

    res.status(204).json(updatedUser);

  } catch (error) {
    console.log(error)
  }

}


export const addStoreToUserFromRoute = async (req, res) =>{
  //el from route es porque tomo los parametros que vienen en req.body
  const dbuserid = req.userDB
  const { storeId, userId } = req.body
  console.log("MENSAJE: addStoreToUserFromRoute() - Asignando StoreId: " + storeId + " al usuarId: " + userId)
  const updatedUser = await addStoreToUser(dbuserid, storeId, userId);
  console.log("vuelvo de addStoreToUser(dbuserid, storeId, userId) ------------------------")
  console.log(updatedUser)
  if(!updatedUser) {
    console.log("ERROR(45654): addStoreToUserFromRoute() - Ha ocurrido un error al intentar addStoreToUser(dbuserid, storeId, userId) ")
    res.status(401).json({message: "Unable to add new store: " + storeId + " to user id" + userId + " in " + dbuserid + " database"});
  }else{
    //ahora tengo que asociar todas las branches tambien. asigne solo la store
    const updatedUserBranchesAdded = await addAllBranchesToUser(dbuserid, storeId, userId)
    if(!updatedUserBranchesAdded) {
      //ACA TENGO QUE HACER UN ROLLBACK. YA AGREGUE LA STORE PERO NO PUEDO AGREGAR SUS BRANCHES
      const updatedUserStoreDeleted = await deleteStoreFromUser(dbuserid, storeId, userId);
      if(!updatedUserStoreDeleted){
        console.log("ERROR(23432): addStoreToUserFromRoute() - Ha ocurrido un error al intentar deleteStoreFromUser(dbuserid, storeId, userId) ")
        res.status(401).json({message: "No es posible deshacer: " + storeId + " added to " + userId + " for " + dbuserid + " database"});  
      }
      console.log("ERROR(45654): addStoreToUserFromRoute() - Ha ocurrido un error al intentar addStoreToUser(dbuserid, storeId, userId) ")
      res.status(401).json({message: "Unable to add branches of storeId: " + storeId + " to user id" + userId + " in " + dbuserid + " database"});
    }else{
      res.status(204).json(updatedUserBranchesAdded);
    }
  }
  
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

export const deleteStoreFromUser = async (dbuserid, storeId, userId) => {
  console.log("MENSAJE: deleteStoreFromUser() - Eliminar la store from user. Hubo un errrrorrr en el paso anterior")
  try {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);

    let userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    if(!userFound){
      console.log( "ERROR(956): NO se encuenta al usuario " + userId);
      return false
    }

    var tiendaQueQuieroEliminar = {store: storeId}

    userFound.tiendas = userFound.tiendas.filter((item)=>{
      return item.store != tiendaQueQuieroEliminar.store
    });

    // actualizamos los cambios en la db.
    console.log("MENSAJE: deleteStoreFromUser() - Eliminar la store from user. actualizando DB")
    const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
      userId,
      userFound,
      {
        new: true,
      }
    )
    if(!updatedUser){
      console.log( "ERROR(23432): error al actualizar la DB " + dbuserid);
      return false 
    }
    return true
  } catch (error) {
    console.log(error)
  }
  
}

export const addStoreToUser = async (dbuserid, storeId, userId) => {
  console.log("MENSAJE: addStoreToUser() - iniciando proceso...")

  try {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  
    //Verifico si existe el usuario en la db del user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    if(!userFound){
      console.log( "ERROR(956): NO se encuenta al usuario " + userId);
      return false
    }
    console.log("desde user.controller:addStoreToUser --> Encontre el user")
    //ahora voy a ver si el usuario ya tiene asociada la store dentro del array de tiendas
    for (let i = 0; i < userFound.tiendas; i++) {
      if(String(userFound.tiendas[i].store) == storeId){
        connsole.log("MENSAJE: La tienda ya existe dentro de la coleccion de tiendas para el user: " +userId)
        return false
      }
    }

    // agregamos la storeId dentro de user.tiendas
    var elementoTiendas = {
      store: storeId,
    }
    userFound.tiendas.push(elementoTiendas)
    ////////////////////////////////////////////////////

    // actualizamos los cambios en la db.
    const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
      userId,
      userFound,
      {
        new: true,
      }
    )
    if(!updatedUser){
      console.log( "ERROR(2432): error al actualizar la DB " + dbuserid);
      return false 
    }
    console.log("MENSAJE: DB " + dbuserid + " actualizada con exito! - storeId:" + storeId +" atachada a " + "userId:" + userId)
    return updatedUser;
 
  } catch (error) {
    console.log(error)
  }
}

export const addAllBranchesToUser = async(dbuserid, storeId, userId) => {
  //La tarea de esta funcion es atachar todas las branches de una tienda a un usuario
  // se implementa de la siguiente manera
  // PASO 1: verifico que exista el userId y el storeId
  // PASO 2: Atachar todas las branches dentro del array de tiendas asociado a su store  -> userId.tiendas[x].branches[]
  // PASO 3: Actualizar la DB

  try {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);

    console.log("MENSAJE: Iniciando proceso addAllBranchesToUser()...")
    //PASO 1 --------------- verifico que exista el userId y el storeId
    console.log("MENSAJE: buscando tienda " + storeId + "...")
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId); 
    if(!storeFound){
      console.log( "ERROR(45654): storeId:" + storeId + " no existe en la coleccion de stores");
      return false
    }
    console.log("MENSAJE: store: " +storeId+ " encontrada.")
    //---------------------------------
    console.log("MENSAJE: buscando user " + userId + "...")
    let userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    if(!userFound){
      console.log( "ERROR(345): NO se encuenta al usuario " + userId);
      return false
    }
    console.log("MENSAJE: user: " +userId+ " encontrado.")
    //FIN PASO 1------------------------------------------------------

    //PASO 2: Atachar la storeId dentro del array de TIENDAS del userId  -> userId.tiendas[]  
    //Primer checkeo de store. me fijo si el user tiene algna store atachada DENTRO DEL ARRAY DE TIENDAS
      console.log("MENSAJE: verificando si el usuario tiene alguna tienda atachada... userFound.tiendas.lengh: " + userFound.tiendas.length)
      if(userFound.tiendas.length == 0){
        console.log( "ERROR(2345): el usuario " + userId + " aun no tiene atachada NINGUN " + storeId);
        return false        
      }
      //pasé ok el primer checkeo. el usuario tiene tiendas atachadas. voy a buscar si tiene la que yo necesito para atacharle las branches.
      console.log("MENSAJE: localizando tienda storeId: " + storeId + " en array de tiendas de userId: " +userId+"...")
      for (let i = 0; i < userFound.tiendas.length; i++) {
        console.log("MENSAJE: userFound.tiendas["+i+"].store =? " + storeId )
        if (String(userFound.tiendas[i].store) == storeId) {
          console.log("MENSAJE: tienda encontrada en array de tiendas del user")
          console.log("MENSAJE: verificando branches para userFound.tiendas["+i+"].branches... lenght: " + userFound.tiendas[i].branches.lengh)
          if(userFound.tiendas[i].branches.length == 0){
            console.log("MENSAJE: lenght=0  clonando array storeFound.branches.()")
            //NO TENGO NINGUNA BRANCH CARGADA DENTRO DE LA STORE. CARGO TODAS
            console.log("storeFound.branches")
            console.log(storeFound.branches)
            console.log("userFound.tiendas[i].branches")
            console.log(userFound.tiendas[i].branches)

            userFound.tiendas[i].branches = storeFound.branches.slice()
            console.log("dessspues de clonaaaaaaar el ararrrrraaaaaaayyy")
            console.log(userFound.tiendas[i])
          }else{
            console.log("MENSAJE: lenght!=0  actualizar array de tienda[x].branches para usuario userId: " +userId)            
            console.log("MENSAJE: vaciando array de branches para el userFound.tiendas[" + i + "].... userFound.tiendas[" + i + "].branches.splice(0, userFound.tiendas[" + i + "].branches.lenght)")            
            userFound.tiendas[i].branches.splice(0, userFound.tiendas[i].branches.lenght)
            console.log("MENSAJE: clonando array storeFound.tiendas["+i+"].branches.slice()")
            userFound.tiendas[i].branches = storeFound.branches.slice()            
          }

          const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
            userId,
            userFound,
            {
              new: true,
            }
          )
          if(!updatedUser){
            console.log( "ERROR(rtret): error al actualizar la DB " + dbuserid);
            return false 
          }
          return updatedUser
          //break        
        }
      }




  } catch (error) {
    console.log(error)
  }
}

export const addBranchToUser = async (dbuserid, storeId, branchId, userId) => {
  console.log("desde user.controller:addBranchToUser <-------------------------")

  try {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  
    //Verifico si existe el usuario en la db del user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
    .populate("roles");;
    console.log(userFound)
    if(!userFound){
      console.log( "ERROR(43655676): NO se encuenta al usuario " + userId);
      return false
    }

    //Verifico si existe el adminMaster user en la db del user
    if(userFound.roles[0].roleName != "adminMaster"){
      const adminMasterFound = await config.globalConnectionStack[dbuserid].user.findById(userFound.adminMasterID);
      if(!adminMasterFound){
        console.log( "ERROR(23432): NO se encuenta adminMaster: "+ userFound.adminMasterID +" user for this usuario " + userId);
        return false
      }
    }

    //Verifico si existe la store de la branch que me estan pasando
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId); 
    if(!storeFound){
      console.log( "ERROR(44565): la storeId: " + storeId + " no existe en la coleccion de stores para dbuserid: " + dbuserid);
      return false
    }
    
    //Verifico si existe la la branch que me estan pasando
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchId); 
    if(!branchFound){
      console.log( "ERROR(44565): la branchId: " + branchId + " no existe en la coleccion de BRANCHES para dbuserid: " + dbuserid);
      return false
    }

    //Verifico si el usuario ya tiene asociada la store dentro del array de tiendas
    let storeFoundInUserTiendas = false
    for (let i = 0; i < userFound.tiendas.length; i++) {
      console.log("voy a compara la store de la tienda del user con el storeId")
      console.log(userFound.tiendas[i].store)
      console.log(storeId)
      if(userFound.tiendas[i].store == storeId){
        storeFoundInUserTiendas = true
        //Verifico si el user ya tiene asociada la branch dentro del array de tiendas
        for (let p = 0; p < userFound.tiendas[i].branches.length; p++) {
          if(userFound.tiendas[i].branches[p]._id == branchId){
            //si pasa esto no tengo que hacer nada. la branch ya esta asociada ok al user
            console.log( "WARNING(44565): la branchId: " + branchId + " EXISTE en la coleccion de branches asociada a este usuario: " + userId + " en dbuserid: " + dbuserid);
            return userFound            
          }
        }
        console.log("MENSAJE: Atachando branchId: " + branchId + " al array de tiendas.store: "+storeId+". userId: " + userId + " - dbuserid: " + dbuserid)
        userFound.tiendas[i].branches.push(branchId)   
        
        const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
          userId,
          userFound,
          {
            new: true,
          }
        )
        
        break
      }
    }
    if(storeFoundInUserTiendas==false){
      console.log("MENSAJE: storeId: " + storeId + " aún no ha sido atachada a este user: " + userId + " - dbuserid: " + dbuserid)
      return false
    }

   
    ///////////////////////////////////////////////////////////////////
    //Ahora tengo que atachar la branch al las tiendas del adminMaster
    if(userFound.roles[0].roleName != "adminMaster"){
      const adminMasterFound = await config.globalConnectionStack[dbuserid].user.findById(userFound.adminMasterID);
      if(!adminMasterFound){
        console.log( "ERROR(23432): NO se encuenta adminMaster: "+ userFound.adminMasterID +" user for this usuario " + userId);
        return false
      }
      console.log("MENSAJE: Actualizando adminMaster tiendas. Atachando nueva branch creada: " + branchId + " - dbuserid: " + dbuserid)
      //Verifico si el usuario ya tiene asociada la store dentro del array de tiendas
      let storeFoundInUserTiendas = false
      for (let i = 0; i < adminMasterFound.tiendas.length; i++) {
        console.log("voy a compara la store de la tienda del user con el storeId")
        console.log(adminMasterFound.tiendas[i].store)
        console.log(storeId)
        if(adminMasterFound.tiendas[i].store == storeId){
          storeFoundInUserTiendas = true
          //Verifico si el user ya tiene asociada la branch dentro del array de tiendas
          for (let p = 0; p < adminMasterFound.tiendas[i].branches.length; p++) {
            if(adminMasterFound.tiendas[i].branches[p]._id == branchId){
              //si pasa esto no tengo que hacer nada. la branch ya esta asociada ok al user
              console.log( "AVISO(44565): la branchId: " + branchId + " EXISTE en la coleccion de branches asociada al adminMaster: " + userFound.adminMasterID + " - dbuserid: " + dbuserid);
              return adminMasterFound            
            }
          }
          console.log("MENSAJE: Atachando branchId: " + branchId + " al array de tiendas.store: "+storeId+". adminMaster: " + userFound.adminMasterID  + " - dbuserid: " + dbuserid)
          adminMasterFound.tiendas[i].branches.push(branchId)  
          
          const updatedAdminMaster = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
            userFound.adminMasterID,
            adminMasterFound,
            {
              new: true,
            }
          )

          break
        }
      }
      if(storeFoundInUserTiendas==false){
        //TENGO QUE HACER UN ROLLBACK ACA. CREE LA branch Y TAMBIEN LA ASOCIÉ AL USER. no puedo asociarla al adminMaster xq no existe la store
        console.log("rollback pendiente!!!!!!!!!---------------fgfhgfhjg--------------------")
        console.log("ERROR: storeId: " + storeId + " aún no ha sido atachada al adminMaster: " + userFound.adminMasterID + " - dbuserid: " + dbuserid)
        return false
      }
    }

    ///////////////////guardoooooo////////////////////////
    

    



/*

    const stores = await config.globalConnectionStack[dbuserid].store.find({ _id: { $in: userFound.stores } }); 
    if(!stores){
      console.log( "ERROR(43655676): el usuario " + userId + " aun no tiene atachada la store " + storeId);
      return false
    }
    console.log("desde user.controller:addBranchToUser --> Tengo Stores")

    // para entender. userFound.stores son todas las tiendas que tiene atachado el user
    // estoy sacando todos los id de las stores y los cargo en un array para poder recorrerlo
  
      let storeAsociadaToUser = false
      for (let i = 0; i < stores.length; i++) {
        if (String(stores[i]._id) == storeId) {
          storeAsociadaToUser = true
          //el usuario tiene la store atachada. puedo atachar la branch. primero me fijo si no la tiene atachada ya
          const branches = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: userFound.branches } }); 
          for (let j = 0; j < branches.length; j++) {
            if (branches._id == branchId) {
              //si llego aca es porque la branch ya estaba atachada. me voy
              console.log("AVISO(34546): user.controller:addBranchToUser -> branch: " + branchId + " ya esta atachada al user: " + userId )
              return false
            }
          }
          // si sali del for sin pasar por el return, tengo que hacerle el push al arreglo y actualizar el user

          //acá agrego la branch al array de tiendas

          for (let i = 0; i < userFound.tiendas.length; i++) {
            console.log("--------------------------------------------------------------------------")
            console.log("userFound.tiendas[i].store._id == storeId - " + userFound.tiendas[i].store._id +" - "+ storeId)
            
            if (String(userFound.tiendas[i].store._id) == storeId) {
              console.log("encontré la storeId dentro de userFound.tiendas  <------*")
              console.log("AGREGO LA BRANCH AL ARRAY DE tiendas")
              console.log("tiro este push: userFound.tiendas[i].branches.push(branchId)")

              userFound.tiendas[i].branches.push(branchId)
            }
          }
          ////////////////////////////////////////////////////
  
          console.log("AGREGO LA BRANCH AL ARRAY DE branches")
          console.log("tiro este push: userFound.branches.push(branchId)")
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
      if (storeAsociadaToUser == false){
        console.log("ERROR(87683): user.controller:addBranchToUser -> La Store: "+ storeId + " aún no ha sido atachada a este user: " + userId)
        return false
      }
 
      */
    console.log("me voy de user.controller:addBranchToUser  <----------------")
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



export const createAdminTiendaUser = async (req, res) => {
  const dbuserid = req.userDB
  try {
    console.log("vamos a crear el user")
    const { username, password, roles, storeId} = req.body;

    console.log("INTENTANDO CREAR UN adminTienda USER - createAdminTiendaUser()")
    console.log("en esta tienda: " + storeId)
    
    if(!username) return res.status(401).json({ message: "createAdminTiendaUser: User name expected" });
    if(!password) return res.status(401).json({ message: "createAdminTiendaUser: password expected" });
    if(!roles) return res.status(401).json({ message: "createAdminTiendaUser: roles expected" });
    if(!storeId) return res.status(401).json({ message: "createAdminTiendaUser: storeId expected" });

    //voy a buscar el dbuserid en la DB global porque ahí guardé el id del adminMaster
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
      adminMasterID: userFound.adminMasterDBuser
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
    const updatedUser = addStoreToUser(dbuserid, storeId, savedUser._id);
   
    //const savedUser = await newUser.save();
    
    return res.status(200).json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      roles: updatedUser.roles,
    });
    
  } catch (error) {
    console.error(error);
  }
  
};

export const createVendedorUser = async (req, res) => {
  const dbuserid = req.userDB
  try {
    console.log("vamos a crear el user")
    const { username, password, roles, branchId} = req.body;

    console.log("INTENTANDO CREAR UN vendedor USER - createVendedorUser()")
    //console.log("en esta tienda: " + storeId)
    
    if(!username) return res.status(401).json({ message: "createVendedorUser: User name expected" });
    if(!password) return res.status(401).json({ message: "createVendedorUser: password expected" });
    if(!roles) return res.status(401).json({ message: "createVendedorUser: roles expected" });
    if(!branchId) return res.status(401).json({ message: "createVendedorUser: branchId expected" });

    //voy a buscar el dbuserid en la DB global porque ahí guardé el id del adminMaster
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
      adminMasterID: userFound.adminMasterDBuser
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

    // vemos de asociar la store al user.stores y user.tiendas
    // tenemos que encontrar el storeId de este branchId
    const storesFound = await config.globalConnectionStack[dbuserid].store.find({branches: branchId});
    console.log("las storesFound ------------------------<> ")
    console.log("la branchId: " + branchId)
    console.log(storesFound)
    console.log("nuevo intento " + storesFound[0]._id)
    //

   let storeAddedToUser = false
   let branchAddedToUser = false
    const updatedUserStore = await addStoreToUser(dbuserid, storesFound[0]._id, savedUser._id)
      .then((res)=>{
          if(res == false){
            console.log("MENSAJE: createVendedorUser() -> Hubo un error al intentar addStoreToUser()")
          } else{
            storeAddedToUser=true
            console.log("MENSAJE: createVendedorUser() -> addStoreToUser() successfully!")
          }
      }).catch((error)=>{
        console.log(`addStoreToUser(): Handling error as we received ${error}`);
      });


    const updatedUserBranch = await addBranchToUser(dbuserid,storesFound[0]._id,branchId,savedUser._id)
      .then((response)=>{
        if(response == false){
          console.log("MENSAJE: createVendedorUser() -> Hubo un error al intentar addBranchToUser()")
        }else{
          branchAddedToUser=true
          console.log("MENSAJE: createVendedorUser() -> addBranchToUser() successfully!")
        }
      }).catch((error)=>{
        console.log(`addBranchToUser(): Handling error as we received ${error}`);
      });

    if(storeAddedToUser==false){
      return res.status(401).json({ message: "createVendedorUser(): error al intentar addStoreToUser()" })
    }
    if(branchAddedToUser==false){
      return res.status(401).json({ message: "createVendedorUser(): error al intentar branchAddedToUser()" })
    }


    return res.status(200).json("successully");

    
  } catch (error) {
    console.error(error);
  }
  
};
