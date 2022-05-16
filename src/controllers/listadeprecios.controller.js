import ListaDePrecios from "../models/ListaDePrecios";
import config from "../config";
import * as storeControler from "./stores.controller";
import * as userconnection from "../libs/globalConnectionStack";



export const getListasDPsByStoreId = async(req, res) => {
  console.log("MENSAJE: getListasDPsByStoreId() - Obteniendo listas de precios para la sucursal: ")
  //res.status(201).json();

  
  const dbuserid = req.userDB;
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  const ldpsFound = await config.globalConnectionStack[dbuserid].listadeprecios.find();
  console.log(ldpsFound)
  res.status(200).json(ldpsFound);

  
}

export const createLDPs = async(req, res) => {
  console.log("MENSAJE: createLDPs() - Creando una nueva lista de precios para la sucursal: ")
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  var storeId = req.body.storeId
  const userId = req.userId   
  const { productName, unidadMedida, codigo, categoria } = req.body;  
 
  try {
    var listadeprecios = new ListaDePrecios();
    //para recoger los parametros que me llegan por el body de la peticion
    var params = req.body;
    
    listadeprecios.listaNombre = params.listaNombre;
    listadeprecios.descripcion = params.descripcion;
    listadeprecios.products = params.products;
    listadeprecios.creadapor = params.creadapor;
    listadeprecios.fechaDeCreacion = params.fechaDeCreacion;
    listadeprecios.storeId = params.storeId;

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    try {

      const saveLdps = Promise.resolve(new config.globalConnectionStack[dbuserid].listadeprecios(listadeprecios).save());
      console.log("antes del THEN")
      saveLdps.then((newLDPs) => {
          console.log("Producto guardado exitosamente")
          //storeControler.addProductToStore(dbuserid, storeId, newProduct._id)
          console.log(newLDPs._id)
          res.status(201).json(newLDPs._id);
      });

    } catch (error) {
        console.log("(234354) Hubo un error al intentar crear el nuevo producto  " + listadeprecios.listaNombre )
        console.log(error)
    }

      //res.status(201).json(newProductSaved);
    
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
}




/*
export const createLDP = async (req, res) => {
  console.log("MENSAJE: createLDP() - vengo a crear/agregar una nueva lista de precios")
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  var storeId = req.body.storeId
  const userId = req.userId   
  const { productName, unidadMedida, codigo, categoria } = req.body;  
 
  try {
    var listadeprecios = new ListaDePrecios();
    //para recoger los parametros que me llegan por el body de la peticion
    var params = req.body;
    
    listadeprecios.listaNombre = params.listaNombre;
    listadeprecios.descripcion = params.descripcion;
    listadeprecios.products = params.products;
    listadeprecios.creadapor = params.creadapor;
    listadeprecios.fechaDeCreacion = params.fechaDeCreacion;

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    try {

      const saveProduct = Promise.resolve(new config.globalConnectionStack[dbuserid].product(producto).save());
      console.log("antes del THEN")
      saveProduct.then((newProduct) => {
          console.log("Producto guardado exitosamente")
          //storeControler.addProductToStore(dbuserid, storeId, newProduct._id)
          console.log(newProduct._id)
          res.status(201).json(newProduct._id);
      });

    } catch (error) {
        console.log("(234354) Hubo un error al intentar crear el nuevo producto  " + producto.productName )
        console.log(error)
    }

      //res.status(201).json(newProductSaved);
    
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
  
  
};
*/