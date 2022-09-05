import Proveedor from "../models/Proveedor";
import config from "../config";
import * as userconnection from "../libs/globalConnectionStack";

export const createProveedor = async (req, res) => {
  console.log("vengo a crear/agregar un nuevo PROVEEDOR")
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

  const { proveedorName, nroContacto, emailContacto, descripProovedor, categoriaRubro } = req.body; 
  
  try {
    var proveedor = new Proveedor();
    //para recoger los parametros que me llegan por el body de la peticion
    var params = req.body;
    
    proveedor.proveedorName = params.proveedorName;
    proveedor.nroContacto = params.nroContacto;
    proveedor.emailContacto = params.emailContacto;
    proveedor.descripProovedor = params.descripProovedor;
    proveedor.categoriaRubro = params.categoriaRubro;

    if (await proveedorNameCargado(dbuserid,proveedor.proveedorName)){
      return res.status(403).json("(6456)Error: el proveedor " + params.proveedorName + " ya existe en la coleccion de proveedores.");
    }else{ 
      if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
      }
      try {

        const savedProveedor = Promise.resolve(new config.globalConnectionStack[dbuserid].proveedor(proveedor).save());

        savedProveedor.then((newProveedor) => {
            console.log("Proveedor guardado exitosamente")
            //storeControler.addProductToStore(dbuserid, storeId, newProduct._id)
            console.log(newProveedor._id)
            res.status(201).json(newProveedor);
        });

      } catch (error) {
          console.log("(234354) Hubo un error al intentar crear el nuevo proveedor  " + proveedor.proveedorName )
          console.log(error)
      }

      //res.status(201).json(newProductSaved);
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
  
};
export const getProveedores = async (req, res) => {
  
    const dbuserid = req.userDB;
    console.log("getProveedores " + dbuserid )
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
  
    const proveedoresFound = await config.globalConnectionStack[dbuserid].proveedor.find()
    .populate("categoriaRubro");
    res.status(200).json(proveedoresFound);
 
};


export const getProveedorById = async (req, res) => {
  
  const dbuserid = req.userDB;
  let proveedorId = req.params.proveedorId;
  console.log("getProveedorById " + dbuserid )
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  const proveedorFound = await config.globalConnectionStack[dbuserid].proveedor.findById(proveedorId)
  .populate("categoriaRubro");
  res.status(200).json(proveedorFound);

};
export const proveedorNameCargado = async (dbuserid, proveedorName) => {
    console.log("vengo a verificar si el proveedor ya existe " + proveedorName)
    // me traigo toda la lista de branches que tiene agregada la tienda y la buardo dentro del "array branches"
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    
    const proveedorNameExistente = await config.globalConnectionStack[dbuserid].proveedor.find({"proveedorName":proveedorName});
    console.log("proveedorNameExistente")
    console.log(proveedorNameExistente)
    console.log(proveedorNameExistente.length)
    if (proveedorNameExistente.length>0){
      return true
    } else{
      return false
    }
}

export const postUpdateProveedor = async(req,res) => {
  console.log("MENSAJE: postUpdateProveedor() - Iniciando proceso...")
  const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
  if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
    console.log("ERROR: postUpdateProveedor() - dbuserid formato inválido. Imposible actualizar proveedor!")
    return res.status(400).json("ERROR: postUpdateProveedor() - dbuserid formato inválido. Imposible actualizar proveedor!");
  } 
  if(!dbuserid){
    console.log("ERROR: postUpdateProveedor() - No dbuserid. dbuserid Expected - Imposible actualizar proveedor!")    
    return res.status(400).json("ERROR: postUpdateProveedor() - No dbuserid. dbuserid Expected - Imposible actualizar proveedor!");
  } 

  const userId = req.userId
  if (!String(userId).match(/^[0-9a-fA-F]{24}$/)){
    console.log("ERROR: postUpdateProveedor() - userId formato inválido. Imposible actualizar proveedor!")
    return res.status(400).json("ERROR: postUpdateProveedor() - userId formato inválido. Imposible actualizar proveedor!");
  } 
  if(!userId){
    console.log("ERROR: postUpdateProveedor() - No userId. dbuserid Expected - Imposible actualizar proveedor!")    
    return res.status(400).json("ERROR: postUpdateProveedor() - No userId. dbuserid Expected - Imposible actualizar proveedor!");
  } 

  const proveedorId = req.params.proveedorId
  if (!String(proveedorId).match(/^[0-9a-fA-F]{24}$/)){
    console.log("ERROR: postUpdateProveedor() - proveedorId formato inválido. Imposible actualizar proveedor!. dbuserid:" + dbuserid)
    return res.status(400).json("ERROR: postUpdateProveedor() - proveedorId formato inválido. Imposible actualizar proveedor!. dbuserid:" + dbuserid);
  } 
  if(!proveedorId){
    console.log("ERROR: postUpdateProveedor() - No proveedorId. proveedorId Expected - Imposible actualizar proveedor!. dbuserid:" + dbuserid)
    return res.status(400).json("ERROR: postUpdateProveedor() - No proveedorId. productId Expected - Imposible actualizar proveedor!. dbuserid:" + dbuserid);
  }

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  };

  const proveedorFound = await config.globalConnectionStack[dbuserid].proveedor.findById(proveedorId)
  if(!proveedorFound) {
    console.log("ERROR: postUpdateProveedor() - Error al obtener proveedorId: " + proveedorId +". Imposible actualizar proveedor!. dbuserid:" + dbuserid )
    return res.status(500).json("ERROR: postUpdateProveedor() - Error al obtener proveedorId: " + proveedorId +". Imposible actualizar proveedor!. dbuserid:" + dbuserid);
  }

  proveedorFound.proveedorName = req.body.proveedorName
  proveedorFound.nroContacto = req.body.nroContacto
  proveedorFound.emailContacto = req.body.emailContacto
  proveedorFound.descripProovedor = req.body.descripProovedor
  proveedorFound.categoriaRubro = req.body.categoriaRubro
  console.log(proveedorFound)

  try {
    const proveedorUpdated = await config.globalConnectionStack[dbuserid].proveedor.findByIdAndUpdate(
      proveedorId,
      proveedorFound,
      {
        new: true,
      }
    )
    if(proveedorUpdated){
      console.log("MENSAJE: proveedorId: " + proveedorId + " actualizado exitosamente!! - dbuserid: " + dbuserid )
      return res.status(200).json(proveedorUpdated);
    }
  } catch (error) {
    console.log(error)
    console.log("ERROR: postUpdateProveedor() - Ha ocurrido al intentar actualizar proveedorId. " + proveedorId + " - dbuserid: " + dbuserid )
    return res.status(500).json("ERROR: postUpdateProveedor() - Ha ocurrido al intentar actualizar proveedorId. " + proveedorId + " - dbuserid: " + dbuserid )
  }

}