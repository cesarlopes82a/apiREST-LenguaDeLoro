import User from "../models/User";
import config from "../config";
import * as userconnection from "../libs/globalConnectionStack";

export const findUserinGlobanDB = async (req, res, next) => {
    try {
        const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir

        //VERIFICO si tengo un formato valido de id
        if (!dbuserid.match(/^[0-9a-fA-F]{24}$/)){
            return res.status(400).json({ message: "Invalid user ID: " + dbuserid });
        } 

        const userFound = await User.findById(dbuserid);    //busco el user id en base de datos global

        if(!userFound) return res.status(403).json({ message: "User id: " + dbuserid + "not found in global DB" });
  
        next();
      
    } catch (error) {
      console.log(error)
      return res.status(500).send({ message: error });
    }
  };

  export  const checkBranchNoAddedtoUser = async(req, res, next) => {
    //aca verfico si la branch NO esta agregada al user
    console.log("estoy en el checkBranchNoAddedtoUser")
    const dbuserid = req.userDB
    const { userId, branchId } = req.body

    //busco el user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    //traigo todas las branches
    const branches = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: userFound.branches } }); 
    if(branches.length>0){
        for (let i = 0; i < branches.length; i++) {
            if (branches[i]._id == branchId) {
                return res.status(401).json({ message: "Branch " + branchId + " already added to " + userId });     
            }
        }
    }
    next();
}

export const checkStoreIsAddedToUser = async(req, res, next) => {
  console.log("estoy en el checkStoreIsAddedToUser")
  const dbuserid = req.userDB
  try {
    const { userId, storeId } = req.body;

    //busco el user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId);
    //traigo todas las tiendas
    const stores = await config.globalConnectionStack[dbuserid].store.find({ _id: { $in: userFound.stores } }); 
    if(stores.length>0){
        for (let i = 0; i < stores.length; i++) {
            if (stores[i]._id == storeId) {
                //si existe la tienda estamos bien para seguir
                next();
                return;
            }
        }
    }
    return res.status(401).json({ message: "Store " + storeId + " not found for " + userId });

  } catch (error) {
    res.status(500).json({ message: error });
  }

}
