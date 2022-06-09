import config from "../config";
import * as storeControler from "./stores.controller";
import * as userControler from "./user.controller";
import * as userconnection from "../libs/globalConnectionStack";
import { storeChecks } from "../middlewares";

//Creamos una nueva tienda 
export const createBranch = async (req, res) => {
  const dbuserid = req.userDB
  const userId = req.userId
  const { storeId, branchName, address } = req.body;  //dbuserid me dice en que db tengo que escribir
  
  //verifico el formato del storeId
  if(!storeId) return res.status(401).json({ message: "storeId expected" });
  if(!String(storeId).match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: "Invalid storeId: " + storeId });

  if(!address) return res.status(401).json({ message: "address expected" });
  if(!branchName) return res.status(401).json({ message: "branchName expected" });
 
  //verifico si me llega el dbuserid para saber cual es la DB con la que voy a trabajar
  if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });

  try {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
    const newBranch = await new config.globalConnectionStack[dbuserid].branch({
      branchName,
      address,
      storeId,
      createdBy:userId
    });
    if(!newBranch) return res.status(401).json({ message: "Unable to create new branch for user " + dbuserid });
    const newSavedBranch = await newBranch.save();  //Guardo la branch en la DB del usuario
    if(!newSavedBranch) return res.status(401).json({ message: "Unable to save new branch: " + newBranch.branchName + " for user id" + dbuserid });

    //actualizo la store para agregarle la nueva branch que acabo de crear
    await storeControler.addBranchToStore(dbuserid, storeId, newSavedBranch._id)

    //avtualizo el user para agregar la nueva branch que acabo de crear
    console.log("el userId " + userId)
    await userControler.addBranchToUser(dbuserid, storeId, newSavedBranch._id, userId)   // addBranchToUser agrega tambien al adminMaster tiendas la branch.

    // le agrego la branch al adminMaster
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
            const adminMasterUpdated = await userControler.addBranchToUser(dbuserid, storeId, newSavedBranch._id , adminMasterUser)
            if(!adminMasterUpdated) res.status(401).json({ 
              message: "(5657)Unable to add new branch: " + newSavedBranch.branchName + " to adminMasterUser id" + adminMasterUser + " in " + dbuserid + " database"
            });
          }
        }
      } 
    }
    */


    res.status(201).json(newSavedBranch);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getBranches = async (req, res) => {
  const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  try {
    const branchesFound = await config.globalConnectionStack[dbuserid].branch.find();
    if(!branchesFound) return res.status(403).json({ message: "No branches found for " + dbuserid + " user"  });

    res.status(200).json(branchesFound);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getBranchById = async (req, res) => {
  const  branchid  = req.params.branchId;

  if (!branchid) return res.status(403).json({ message: "No branch id provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(branchid).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid branch ID: " + branchid });
  } 

  const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  try {
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchid);
    if(!branchFound) return res.status(403).json({ message: "Branch " + branchid + " not found" });

    res.status(200).json(branchFound);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const deleteBranchById = async (req, res) => {
  const  branchid  = req.params.branchId;
  if (!branchid) return res.status(403).json({ message: "No branch id provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(branchid).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid branch ID: " + branchid });
  } 

  const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  try {
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findByIdAndDelete(branchid);
    if(!branchFound) return res.status(403).json({ message: "Branch " + branchid + " not found" });

    //voy a eliminar esta branch del array de branches de la store dueña
    const storeId = await storeControler.findBranchStoreOwner(branchid,dbuserid)
    if(storeId){
      await storeControler.deleteBranchFromStore(storeId, branchid, dbuserid)
    }

    res.status(204).json({ message: "Branch: " + branchid + " successfully deleted" });

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const updateBranchById = async (req, res) => {
  const  branchid  = req.params.branchId;
  const dbuserid = req.userDB
  if (!branchid) return res.status(403).json({ message: "No branch ID provided" });

  //VERIFICO si tengo un formato valido de id
  if (!String(branchid).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid branch ID: " + branchid });
  } 

  const { branchName, address } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });
  if (!branchName) return res.status(403).json({ message: "No branchName name provided" });
  if (!address) return res.status(403).json({ message: "No address provided" });

  try {
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchid);
    if(!branchFound) return res.status(403).json({ message: "branch " + branchid + " not found" });
    branchFound.branchName = branchName   //--> esto es lo que voy a actualizar
    branchFound.address = address   //--> esto es lo que voy a actualizar
    const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
      branchid,
      branchFound,
        {
          new: true,
        }
      );
     return res.status(204).json(updatedBranch);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const registrarNewCompra = async (dbuserid, userId, branchId, compraId) => {

if(!dbuserid){ console.log("ERROR - registrarNewCompra(): dbuserid expected"); return false }
if(!userId){ console.log("ERROR - registrarNewCompra(): userId expected"); return false }
if(!branchId){ console.log("ERROR - registrarNewCompra(): branchId expected"); return false }
if(!compraId){ console.log("ERROR - registrarNewCompra(): compraId expected"); return false }

  try {
    //Verifico si existe el usuario, la sucursal y el registro de la compra en la db del user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
    if(!userFound){ console.log("MENSAJE(3454354): el usuario " + userId + " NO existe en la coleccion de USUARIOS."); return false } 

    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchId)
    if(!branchFound){ console.log("MENSAJE(3454354): la sucursal " + branchId + " NO existe en la coleccion de SUCURSALES."); return false } 
    
    const compraFound = await config.globalConnectionStack[dbuserid].compra.findById(compraId)
    if(!compraFound){ console.log("MENSAJE(3454354): registro de compra " + compraId + " NO existe en la coleccion de COMPRAS."); return false } 

    //voy a verificar si esta compra no ha sido asociada a ninguna otra sucursal
    const compraAttached = await config.globalConnectionStack[dbuserid].branch.find({compras: compraId})
   // console.log("MENESAJE: registrarNewCompra() - Esta compra ya ha sido asociada a una sucursal")
    if(compraAttached.length > 0 ){
      console.log("MENESAJE: registrarNewCompra() - NO SE REALIZA ASIGNACION")
    } else{
      branchFound.compras.push(compraId)
      try {
        const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
          branchId,
          branchFound,
          {
            new: true,
          }
        )
        console.log("MENESAJE: registrarNewCompra() - Coleccion de branch actualizada con exito. La compra ha sido asociada a la sucursal!")
        return updatedBranch
      } catch (error) {
        console.log("MENESAJE: registrarNewCompra() - Esta compra ya ha sido asociada a una sucursal")
        console.log(error)
        return false
      }
    }
 
  } catch (error) {
    console.log("ERROR(67934): " + error)
    return false
  }
};

export const registrarNewVenta = async (dbuserid, userId, branchId, ventaId) => {

  if(!dbuserid){ console.log("ERROR - registrarNewVenta(): dbuserid expected"); return false }
  if(!userId){ console.log("ERROR - registrarNewVenta(): userId expected"); return false }
  if(!branchId){ console.log("ERROR - registrarNewVenta(): branchId expected"); return false }
  if(!ventaId){ console.log("ERROR - registrarNewVenta(): compraId expected"); return false }
  
    try {
      //Verifico si existe el usuario, la sucursal y el registro de la venta en la db del user
      const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
      if(!userFound){ console.log("MENSAJE(3454354): el usuario " + userId + " NO existe en la coleccion de USUARIOS."); return false } 
  
      const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchId)
      if(!branchFound){ console.log("MENSAJE(3454354): la sucursal " + branchId + " NO existe en la coleccion de sucursales/branches."); return false } 
      
      const ventaFound = await config.globalConnectionStack[dbuserid].venta.findById(ventaId)
      if(!ventaFound){ console.log("MENSAJE(3454354): registro de venta " + ventaId + " NO existe en la coleccion de VENTAS."); return false } 
  
      //voy a verificar si esta venta no ha sido asociada a ninguna otra sucursal
      const ventaAttached = await config.globalConnectionStack[dbuserid].branch.find({compras: ventaId})
     
      if(ventaAttached.length > 0 ){
        console.log("MENESAJE: registrarNewVenta() - NO SE REALIZA ASIGNACION de venta")
      } else{
        branchFound.ventas.push(ventaId)
        try {
          const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
            branchId,
            branchFound,
            {
              new: true,
            }
          )
          console.log("MENESAJE: registrarNewVenta() - Coleccion de branch actualizada con exito. La compra ha sido asociada a la sucursal!")
          return updatedBranch
        } catch (error) {
          console.log("MENESAJE: registrarNewVenta() - Esta venta ya ha sido asociada a una sucursal")
          console.log(error)
          return false
        }
      }
   
    } catch (error) {
      console.log("ERROR(67934): " + error)
      return false
    }
  };
  

export const actualizarStock = async (dbuserid, userId, branchId, productId, cantidad, operacion) => {
  console.log("MENESAJE: actualizarStock() - vengo a actualizar el stock de mercaderias ")

  if(!dbuserid){ console.log("ERROR - actualizarStock(): dbuserid expected"); return false }
  if(!userId){ console.log("ERROR - actualizarStock(): userId expected"); return false }
  if(!branchId){ console.log("ERROR - actualizarStock(): branchId expected"); return false }
  if(!productId){ console.log("ERROR - actualizarStock(): productId expected"); return false }
  if(!cantidad){ console.log("ERROR - actualizarStock(): cantidad expected"); return false }
  if(!operacion){ console.log("ERROR - actualizarStock(): operacion expected"); return false }

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  try {
    //Verifico si existe el usuario, la sucursal y el producto en la db del user
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
    if(!userFound){ console.log("MENSAJE(7562): el usuario " + userId + " NO existe en la coleccion de USUARIOS."); return false } 

    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchId)
    if(!branchFound){ console.log("MENSAJE(7562): la sucursal " + branchId + " NO existe en la coleccion de USUARIOS."); return false } 
    
    const productFound = await config.globalConnectionStack[dbuserid].product.findById(productId)
    if(!productFound){ console.log("MENSAJE(7562): el producto " + productId + " NO existe en la coleccion de USUARIOS."); return false } 

    //voy a buscar si el producto ya se encuentra en stock de la branch
    const productInBranchFound = await config.globalConnectionStack[dbuserid].branch.findOne({ _id: branchId, "stock.product": productId })

    if(operacion == "agregar"){  // tenemos que agregar productos al stock de la sucursal
      if(!productInBranchFound){ // el producto aún no existe dentro del stock de la sucursal
        console.log("MENSAJE: el producto aún no existe dentro del stock de la sucursal. agrego un elemento nuevo en stock para esta sucursal")
        let elementoStock = {
          product: productId,
          cantidad: cantidad
        }
        branchFound.stock.push(elementoStock)
        const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
          branchId,
          branchFound,
          {
            new: true,
          }
        )
      }else{ // el producto ya se encuentra en el array de stock de la sucursal solo tengo que sumar/restar cantidad
        console.log("MENSAJE: el producto existe en la sucursal. modifico la cantidad de este producto para esta sucursal")
        for (let i = 0; i < productInBranchFound.stock.length; i++) {
          if(String(productInBranchFound.stock[i].product) == productId){
            productInBranchFound.stock[i].cantidad = productInBranchFound.stock[i].cantidad + Number(cantidad)
            break
          }
        }
        const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
          branchId,
          productInBranchFound,
          {
            new: true,
          }
        )
        return updatedBranch;
      }
      
    }

  }
  catch (error) {
    console.log("ERROR(35652): " + error)
    return false
  }
  
}