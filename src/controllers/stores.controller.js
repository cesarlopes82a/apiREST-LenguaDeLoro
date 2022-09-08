import config from "../config";
import * as usersCtrl from "./user.controller";
import * as userconnection from "../libs/globalConnectionStack";

//Creamos una nueva tienda 
export const createStore = async (req, res) => {
  console.log("vengo a crear una nueva tienda")
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  const userId = req.userId   // es el id del USER QUE INTENTA CREAR LA STORE en la DB del user
  const { storeName } = req.body;  
  try {
    //SIEMPRE CREO LA STORE EN LA COLECCION DE STORES PRIMERO despues la atacho al user
    const newStore = await new config.globalConnectionStack[dbuserid].store({
      //save user model to the corresponding stack
      storeName,
      branches: [],
      createdBy:userId,
    });
    if(!newStore){
      return res.status(401).json({
        message: "Unable to create new store for user " + dbuserid,
      });
    }
    const newSavedStore = await newStore.save();  //Guardo la store que acabo de crear
    if(!newSavedStore){
      return res.status(401).json({
        message: "Unable to save new store: " + newStore.storeName + " for user id" + dbuserid,
      });
    }

    //tengo que atachar la tienda que acabo de crear al adminMaster Y AL USER QUE LA CREó
    //ATACHO LA store DENTRO DE las tiendas del USER
    const updatedUser = await usersCtrl.addStoreToUser(dbuserid, newSavedStore._id , userId)
    if(!updatedUser) res.status(401).json({ 
      message: "Unable to add new store: " + newStore.storeName + " to user id" + userId + " in " + dbuserid + " database"
    });

   

    //voy a atachar la tienda que acabo de crear al adminMaster
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
    .populate("roles");
    if(!userFound){
      //TENGO QUE HACER UN ROLLBACK ACA. CREE LA STORE Y TAMBIEN LA ASOCIÉ AL USER
      console.log("rollback pendiente!!!!!!!!!----8989------------------------")
      res.status(401).json({ 
        message: "MENSAJE: Algo salió mal! no puedo identificar el usuario que hace el pedido. userId: " + userId
      });
    }

    //Si soy el admin master no necesito agregarle la tienda al adminMaster xq ya soy yo y y lo hice

    if(userFound.roles[0].roleName != "adminMaster"){
      const adminMasterFound = await config.globalConnectionStack[dbuserid].user.findById(userFound.adminMasterID)
      if(!adminMasterFound){
        //TENGO QUE HACER UN ROLLBACK ACA. CREE LA STORE Y TAMBIEN LA ASOCIÉ AL USER
        console.log("rollback pendiente!!!!!!!!!----------54564--------------------")
        res.status(401).json({ 
          message: "MENSAJE: Algo salió mal! no puedo ENCONTRAR el adminMaster para este usuario. userId: " + userId
        });
      }

      const updatedUser = await usersCtrl.addStoreToUser(dbuserid, newSavedStore._id , userFound.adminMasterID)
      if(!updatedUser) res.status(401).json({ 
        message: "Unable to add new store: " + newStore.storeName + " to user id" + userId + " in " + dbuserid + " database"
      });
    }

    

/*
    console.log("------------------------------------")
    const usersFound = await config.globalConnectionStack[dbuserid].user.find()
    .populate("roles");
    let salir = false
    let adminMasterUser = ""
    for (let i = 0; i < usersFound.length; i++) {
      if(salir==true) break
      for (let o = 0; o < usersFound[o].roles.length; o++) {
        if(usersFound[i].roles[o].roleName === "adminMaster"){
          console.log(`${usersFound[i]._id}` + " - " + userId)
          if(usersFound[i]._id == userId){
            console.log("SOY EL ADMIN MASTER Y NO TENGO QUE HACER nada")
            salir=true
            break
          } else{
            //esta es la parte importante. encontrar el id del adminMaster para poder atacharle la tienda
            adminMasterUser=usersFound[i]._id
            const adminMasterUpdated = await usersCtrl.addStoreToUser(dbuserid, newSavedStore._id , adminMasterUser)
            if(!adminMasterUpdated) res.status(401).json({ 
              message: "Unable to add new store: " + newStore.storeName + " to adminMasterUser id" + adminMasterUser + " in " + dbuserid + " database"
            });
          }
        }
      } 
    }
    */
    

    res.status(201).json(newSavedStore);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const findStoreById = async (req, res) => {
  const dbuserid = req.userDB
  const { storeId } = req.body; 
  if (!storeId) return res.status(403).json({ message: "No store ID provided" });
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  //VERIFICO si tengo un formato valido de id
  if (!String(storeId).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid store ID: " + storeId });
  } 

  const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
  if(!storeFound) return res.status(403).json({ message: "Store " + storeId + " not found" });

  res.status(201).json(storeFound);
}

export const updateStoreById = async (req, res) => {
  const dbuserid = req.userDB
  const  storeId  = req.params.storeId;
  if (!storeId) return res.status(403).json({ message: "No store ID provided" });

  //VERIFICO si tengo un formato valido de id
  if (!String(storeId).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid store ID: " + storeId });
  } 

  const { storeName } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });
  if (!storeName) return res.status(403).json({ message: "No storeName name provided" });

  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
    if(!storeFound) return res.status(403).json({ message: "Store " + storeId + " not found" });
    storeFound.storeName = storeName   //--> esto es lo que voy a actualizar
    const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
      storeId,
      storeFound,
        {
          new: true,
        }
      );
      console.log("sigo")
     return res.status(204).json(updatedStore);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};


//Buscamos una tienda por ID
export const getStoreById = async (req, res) => {
  console.log("vengo a buscar una store by id en el store controler.")
  const  storeId  = req.params.storeId;
  if (!storeId) return res.status(403).json({ message: "No store ID provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(storeId).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid store ID: " + storeId });
  } 

  const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  await userconnection.checkandcreateUserConnectionStack(dbuserid);

  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
    if(!storeFound) return res.status(403).json({ message: "Store " + storeId + " not found" });

    res.status(200).json(storeFound);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

//Buscamos todas las tiendas
export const getStores = async (req, res) => {
  console.log("esto es el getStores")
  const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
  console.log("el req.userDB " + req.userDB)
  console.log(req.headers['x-access-token'])
  if (!dbuserid) return res.status(408).json({ message: "No dbuserid ID provided" });

  try {
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    const storesFound = await config.globalConnectionStack[dbuserid].store.find();
    if(!storesFound) return res.status(403).json({ message: "No stores found for " + dbuserid + " user"  });

    res.status(200).json(storesFound);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};


//Eliminamos una tienda por ID
export const deleteStoreById = async (req, res) => {
  const  storeId  = req.params.storeId;
  if (!storeId) return res.status(403).json({ message: "No store ID provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(storeId).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid store ID: " + storeId });
  } 

  const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findByIdAndDelete(storeId);
    if(!storeFound) return res.status(403).json({ message: "Store " + storeId + " not found" });

    res.status(204).json({ message: "Store: " + storeId + " successfully deleted" });

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

//uso esta funcion cuando creo una nueva branch. 
export const addBranchToStore = async (dbuserid, storeId, branchId) => {
  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
    console.log(storeFound)
    
    // me traigo toda la lista de branches que tiene agregada la tienda y la buardo dentro del "array branches"
    const branches = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: storeFound.branches } });
    console.log(branches)

    // recorro el array branches para ver si ya existe la nueva branch que quiero cargar
    if(branches.length>0){
      for (let i = 0; i < branches.length; i++) {
        if (branches[i]._id == branchId) {
          //si la branch existe, no hago nada, salgo y doy un mensaje de error
          return message.json({ message: "Branch already added to this store" });     
        }
      }
    }
    //agrego la branch dentro del array de branches de la store
/*
    console.log("voy a hacer el test de agregar la branch al array de branches")
    //esto es un test
    var elementoBranch = {
      branch: branchId,
    }
  //  storeFound.tiendas.branches.push(elementoBranch)
    ////////////////////////////////////////////////////
*/
    storeFound.branches.push(branchId)
    console.log("este esl store found actualizado: " + storeFound)
    try {
      const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
        storeId,
        storeFound,
        {
          new: true,
        }
      );
      if(!updatedStore){
        console.log( "error al intentar acutalizar updating store" )
      }
      console.log("el updatedStore: " + updatedStore)
    } catch (error) {
      console.log("Error al intentar branch.findByIdAndUpdate ")
      console.log(error);
      return res.status(500).json(error);
    }
  } catch (error) {
    console.log("Error al intentar obtener user store.findByid(storeId) ")
    console.log(error);
    return res.status(500).json(error);
  }
}

export const addProductToStore = async (dbuserid, storeId, productId) => {
  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
    console.log("esta esla storeFound")
    console.log(storeFound)
    
    //agrego la productId dentro del array de products de la store
    storeFound.products.push(productId)
    console.log("este esl store found actualizado: " + storeFound)

    //Actualizo la store
    try {
      const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
        storeId,
        storeFound,
        {
          new: true,
        }
      );
      if(!updatedStore){
        console.log( "error al intentar acutalizar updating store" )
      }
      console.log("el updatedStoreeeee: " + updatedStore)
    } catch (error) {
      console.log("Error al intentar branch.findByIdAndUpdate ")
      console.log(error);
      return res.status(500).json(error);
    }
    
/*
    // me traigo toda la lista de products que tiene agregada la tienda y la guardo dentro del "array products"
    const products = await config.globalConnectionStack[dbuserid].products.find({ _id: { $in: storeFound.products } });
    console.log("estos son los products que trajo [dbuserid].products.find({ _id: { $in: storeFound.products } })")
    console.log(products)

    // recorro el array branches para ver si ya existe la nueva products que quiero cargar
    if(products.length>0){
      for (let i = 0; i < products.length; i++) {
        if (products[i]._id == productId) {
          //si la product existe, no hago nada, salgo y doy un mensaje de error
          return message.json({ message: "(353)productId already added to this store" });     
        }
      }
    }
    //agrego la productId dentro del array de products de la store
    console.log("voy a hacer el test de agregar la branch al array de branches")
    //esto es un test
    var elementoProduct = {
      product: productId,
    }
  //  storeFound.tiendas.branches.push(elementoBranch)
    ////////////////////////////////////////////////////

    storeFound.products.push(productId)
    console.log("este esl store found actualizado: " + storeFound)
    try {
      const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
        storeId,
        storeFound,
        {
          new: true,
        }
      );
      if(!updatedStore){
        console.log( "error al intentar acutalizar updating store" )
      }
      console.log("el updatedStore: " + updatedStore)
    } catch (error) {
      console.log("Error al intentar branch.findByIdAndUpdate ")
      console.log(error);
      return res.status(500).json(error);
    }
    */
  } catch (error) {
    console.log("Error al intentar obtener user store.findByid(storeId) ")
    console.log(error);
    return res.status(500).json(error);
  }

  
}


export const deleteBranchFromStore = async (storeId, branchid, dbuserid) => {
  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
    if (!storeFound) return res.status(400).json({ message: "The store " + storeId + " does not exists for this user"});

    const branchesUpdated = storeFound.branches.filter(element => element != branchid);
    storeFound.branches = branchesUpdated;
    const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
      storeId,
      storeFound,
      {
        new: true,
      }
    );

  } catch (error) {
    console.log("Error al intentar .store.findById(storeId)")
      console.log(error);
      return res.status(500).json(error);
  }
}

export const findBranchStoreOwner = async (branchid, dbuserid) => {
  if (!branchid) return res.status(403).json({ message: "No branch ID provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(branchid).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid branch ID: " + storeId });
  } 
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  //const userFound = await config.globalConnectionStack[dbuserid].findById(req.userId);
  //if(!userFound) return res.status(401).json({ message: "User not found" });

  try {
    //busco todas las tiendas del usuario
    const storesFound = await config.globalConnectionStack[dbuserid].store.find();
    if(storesFound) {console.log("encontre "+ storesFound.length+ " stores")
    let branchStoreOwner = null
    //voy a recorrer el array de tiendas del usuario para ver si en alguna de ellas está la branch que tengo que eliminar
      for (let i = 0; i < storesFound.length; i++) {
        if(storesFound[i].branches.length >0){
          //esta tienda tiene branches asociadas, me fijo si está la que quiero eliminar
          const arreglo = storesFound[i].branches.filter(element => element != branchid)
          if(storesFound[i].branches.length > arreglo.length)  return branchStoreOwner = storesFound[i]._id
        }
        
        console.log("---------")
       
      }

    //console.log("las stores: " + storesFound)
    }else {
      console.log("no encontre stores")
    }
    
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
 
}



export const addListadpToStore = async (dbuserid, storeId, listaId) => {
  console.log("MENSAJE: store.controller - addListadpToStore() - actualizando store para agregar la nueva lista de precios DB: " + dbuserid +" Store: "+ storeId +" LDP: "+listaId)
  try {

    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
    console.log(storeFound)
    
    // me traigo toda las listas de precios que tiene agregada la store y la guardo dentro del "array listasdp"
    const listasdp = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: storeFound.listasdeprecios } });
    console.log(listasdp)

    // recorro el array listasdp para ver si ya existe la nueva lista de precios que quiero cargar
    if(listasdp.length>0){
      for (let i = 0; i < listasdp.length; i++) {
        if (listasdp[i]._id == listaId) {
          //si la listaId existe, no hago nada, salgo y doy un mensaje de error
          console.log("MENSAJE: listaId " + listaId + " already added to this store")
          return message.json({ message: "listaId " + listaId + " already added to this store" });     
        }
      }
    }

    //agrego la listaId dentro del array de listas de precios de la store
    storeFound.listasdeprecios.push(listaId)
    try {
      const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
        storeId,
        storeFound,
        {
          new: true,
        }
      );
      if(!updatedStore){
        console.log("MENSAJE: [dbuserid].store.findByIdAndUpdate - error al intentar acutalizar store" )
      }
      console.log("SUCCESS: Store " + storeId + " actualizada con exito. Lista de Precios " + listaId + " successfully added TO STORE.")
      return updatedStore

    } catch (error) {
      console.log("ERROR: Error al intentar [dbuserid].store.findByIdAndUpdate ")
      console.log(error);
      return false
    }
  } catch (error) {
    console.log("ERROR: Error al intentar obtener STORE [dbuserid].store.findById(storeId)")
    console.log(error);
    return false
  }
  
  
}
export const eliminarStore = async (req, res) => {
  console.log("MENSAJE: eliminarRegistrarCompra() - Iniciando proceso de eliminacion de registro de compra")
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
 
  const storeId = req.params.storeId

  if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
      console.log("ERROR: dbuserid formato inválido. Imposible obtener ventas!")
      return res.status(400).json("ERROR: dbuserid formato inválido. Imposible obtener ventas!");
  } 
  if(!dbuserid){
      console.log("ERROR: No dbuserid. dbuserid Expected - Imposible obtener ventas!")    
      return res.status(400).json("ERROR: No dbuserid. dbuserid Expected - Imposible obtener ventas!");
  }

  const userId  = req.userId;
  if (!String(userId).match(/^[0-9a-fA-F]{24}$/)){
      console.log("ERROR: userId formato inválido. Imposible obtener ventas!")
      return res.status(400).json("ERROR: userId formato inválido. Imposible obtener ventas!");
  } 
  if(!userId){
      console.log("ERROR: No userId. userId Expected - Imposible obtener ventas!")
      return res.status(400).json("ERROR: No userId. userId Expected - Imposible obtener ventas!");
  } 

  const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
  .populate("tiendas")
    .populate("tiendas.branches")
    .populate({ 
        path: 'tiendas.store',
        populate: {
          path: 'store',
          model: 'Store'
        } 
     })

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  //elimino las compras
  for (let t = 0; t < userFound.tiendas.length; t++) {
    console.log("1111111111111111111111111111111111111111111111111")
    console.log(userFound.tiendas)
    console.log("1111111111111111111111111111111111111111111111111")
    console.log(userFound.tiendas[t].store._id)
    if (String(userFound.tiendas[t].store._id) == String(storeId)){
      console.log("userFound.tiendas[t].store._id    encontradaaaaaaaaaaa")
      console.log(userFound.tiendas[t].store._id)
      console.log(userFound.tiendas[t].branches.length)
      console.log(userFound.tiendas[t].branches)
      for (let b = 0; b < userFound.tiendas[t].branches.length; b++) {
        
        //ELIMINO LAS VENTAS
        console.log("MENSAJE: eliminando ventas para branchId: " + userFound.tiendas[t].branches[b]._id)
        for (let v = 0; v < userFound.tiendas[t].branches[b].ventas.length; v++){ 
          var id = String(userFound.tiendas[t].branches[b].ventas[v]._id)
          const ventaDeleted = await config.globalConnectionStack[dbuserid].venta.findByIdAndDelete(id, function (err, docs) {
            if (err){
                console.log(err)
            }
            else{
                console.log("Deleted : ", docs);
            }
          });
        }
        //ELIMINO LAS compras
        console.log("MENSAJE: eliminando compras para branchId: " + userFound.tiendas[t].branches[b]._id)
        for (let c = 0; c < userFound.tiendas[t].branches[b].compras.length; c++){ 
          var id = String(userFound.tiendas[t].branches[b].compras[c]._id)
          const compraDeleted = await config.globalConnectionStack[dbuserid].compra.findByIdAndDelete(id, function (err, docs) {
            if (err){
                console.log(err)
            }
            else{
                console.log("Deleted : ", docs);
            }
          });
        }
        
        //ELIMINO LA branch
        console.log("MENSAJE: eliminando branchId: " + userFound.tiendas[t].branches[b]._id)
        var id = String(userFound.tiendas[t].branches[b]._id)
        const branchDeleted = await config.globalConnectionStack[dbuserid].branch.findByIdAndDelete(id, function (err, docs) {
          if (err){
              console.log(err)
          }
          else{
              console.log("Deleted : ", docs);
          }
        });

      }
      //Elimino listas de precios
      console.log("MENSAJE: eliminando listadeprecios...")
      const listasDeleted = await config.globalConnectionStack[dbuserid].listadeprecios.deleteMany( { storeId: storeId } )

      //Elimino los productos
      console.log("MENSAJE: eliminando productos...")
      const productsDeleted = await config.globalConnectionStack[dbuserid].product.deleteMany( { storeId: storeId } )
 
      //Elimino los tienda
      console.log("MENSAJE: eliminando tienda " + storeId + "...")
      const storeDeleted = await config.globalConnectionStack[dbuserid].store.deleteMany( { _id: storeId } )

    }
  }

  //Elimino la tienda del perfil de los useruarios
  const usersFound = await config.globalConnectionStack[dbuserid].user.find()
  
  for (let u = 0; u < usersFound.length; u++){
    let tiendasFiltered = []
    for (let t = 0; t < usersFound[u].tiendas.length; t++){ 
      console.log(usersFound[u].tiendas[t])
      if(String(usersFound[u].tiendas[t].store)!=String(storeId)){
        tiendasFiltered.push(usersFound[u].tiendas[t])
      }
    }
    //borro el array
    usersFound[u].tiendas.splice(0, usersFound[u].tiendas.length);
    //lleno el array sin la tienda que acabo de eliminar
    usersFound[u].tiendas = tiendasFiltered.slice();
    //actualizo la db
    const updatedUser = await config.globalConnectionStack[dbuserid].user.findByIdAndUpdate(
      usersFound[u]._id,
      usersFound[u],
      {
        new: true,
      }
    )
    if(!updatedUser){
      console.log( "ERROR(23453): error al actualizar la DB " + dbuserid);
      return false 
    }
  }


  console.log("store idddd: " + storeId)
  return res.status(200).json({ 
    message: "successfully"})
}