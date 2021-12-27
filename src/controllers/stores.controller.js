import config from "../config";

//Creamos una nueva tienda 
export const createStore = async (req, res) => {
  const { storeName, dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  try {
    const newStore = await new config.globalConnectionStack[dbuserid].store({
      //save user model to the corresponding stack
      storeName,
      branches: [],
    });
    if(!newStore){
      return res.status(401).json({
        message: "Unable to create new store for user " + dbuserid,
      });
    }
    const newSavedStore = await newStore.save();  //Guardo la store en la DB del usuario
    if(!newSavedStore){
      return res.status(401).json({
        message: "Unable to save new store: " + newStore.storeName + " for user id" + dbuserid,
      });
    }

    res.status(201).json(newSavedStore);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const findStoreById = async (req, res) => {
  const { storeId, dbuserid} = req.body; 
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
  const  storeId  = req.params.storeId;
  if (!storeId) return res.status(403).json({ message: "No store ID provided" });

  //VERIFICO si tengo un formato valido de id
  if (!String(storeId).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid store ID: " + storeId });
  } 

  const { storeName, dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
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
  const  storeId  = req.params.storeId;
  if (!storeId) return res.status(403).json({ message: "No store ID provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(storeId).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid store ID: " + storeId });
  } 

  const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

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
  const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid ID provided" });

  try {
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

  const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
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


export const addBranchToStore = async (storeid, branchid, dbuserid) => {
  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeid);
    if (!storeFound) return res.status(400).json({ message: "The store " + storeid + " does not exists for this user"});

    // me traigo toda la lista de branches que tiene agregada la tienda y la buardo dentro del "array branches"
    const branches = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: storeFound.branches } });

    // recorro el array branches para ver si ya existe la nueva branch que quiero cargar
    if(branches.length>0){
      for (let i = 0; i < branches.length; i++) {
        if (branches[i]._id == branchid) {
          //si la branch existe, no hago nada, salgo y doy un mensaje de error
          return res.status(401).json({ message: "Branch already added to this store" });     
        }
      }
    }
    //agrego la branch dentro del array de branches de la store
    storeFound.branches.push(branchid)
    console.log("este esl store found actualizado: " + storeFound)
    try {
      const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
        storeid,
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
    console.log("Error al intentar obtener user store.findByid(storeid) ")
    console.log(error);
    return res.status(500).json(error);
  }
}

export const deleteBranchFromStore = async (storeid, branchid, dbuserid) => {
  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeid);
    if (!storeFound) return res.status(400).json({ message: "The store " + storeid + " does not exists for this user"});

    const branchesUpdated = storeFound.branches.filter(element => element != branchid);
    storeFound.branches = branchesUpdated;
    const updatedStore = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
      storeid,
      storeFound,
      {
        new: true,
      }
    );

  } catch (error) {
    console.log("Error al intentar .store.findById(storeid)")
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
