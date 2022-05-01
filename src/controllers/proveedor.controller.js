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
  
    const proveedoresFound = await config.globalConnectionStack[dbuserid].proveedor.find();
    res.status(200).json(proveedoresFound);
 
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