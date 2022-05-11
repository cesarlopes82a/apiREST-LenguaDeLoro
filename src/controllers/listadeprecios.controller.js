import Product from "../models/Product";
import config from "../config";
import * as storeControler from "./stores.controller";
import * as userconnection from "../libs/globalConnectionStack";

export const createProduct = async (req, res) => {
  console.log("vengo a crear/agregar un nuevo producto")
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  var storeId = req.body.storeId
  const userId = req.userId   // es el id del adminMaster en la DB del user
  const { productName, unidadMedida, codigo, categoria } = req.body;  
 
  try {
    var producto = new Product();
    //para recoger los parametros que me llegan por el body de la peticion
    var params = req.body;
    
    producto.productName = params.productName;
    producto.unidadMedida = params.unidadMedida;
    producto.codigo = params.codigo;
    producto.categoriaRubro = params.categoria;


    if (await codigoCargado(dbuserid,params.codigo)){
      return res.status(403).json("(6456)Error: el codigo " + params.codigo + " ya existe en la coleccion de productos.");
    }else{ 
      if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
      }
      try {

        const saveProduct = Promise.resolve(new config.globalConnectionStack[dbuserid].product(producto).save());

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
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
  
};