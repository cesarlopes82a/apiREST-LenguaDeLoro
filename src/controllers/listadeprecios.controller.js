import ListaDePrecios from "../models/ListaDePrecios";
import config from "../config";
import * as storeControler from "./stores.controller";
import * as productCtrl from "../controllers/products.controller";
import * as comprasCtrl from "../controllers/compra.controller";
import * as userconnection from "../libs/globalConnectionStack";




export const getListasDPsByStoreId = async(req, res) => {
  console.log("MENSAJE: getListasDPsByStoreId() - Obteniendo listas de precios para la sucursal: ")
  //res.status(201).json();
  
  const dbuserid = req.userDB;
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
      await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  const ldpsFound = await config.globalConnectionStack[dbuserid].listadeprecios.find()
  .populate("creadapor")
  .populate("products");
  console.log(ldpsFound)
  res.status(200).json(ldpsFound);

  
}

export const getListasdpByStoreIdAndPopulateInfo = async(req, res) => {
  const dbuserid = req.userDB
  let storeId = req.params.storeId
  console.log("MENSAJE: Obteniendo las listas de precios para la tiendaa: " + storeId)

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  //voy a verificar si lo que me estan pasando como storeId es realmente una store o una branch
  //si es una branch, voy a tener que buscar si store.
  try {
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId)
    if(!storeFound){
      console.log("MENSAJE: Obteniendo store owner for branch: " +storeId)
      const storeFound4Branch = await config.globalConnectionStack[dbuserid].store.find({branches:storeId})
      if(storeFound4Branch){        
        console.log("MENSAJE: Store owner for branch: " +storeId +" Encontrada! - storeId: " + storeFound4Branch[0]._id)
        storeId=storeFound4Branch[0]._id
      }else{
        console.log("MENSAJE: (34453) el storeId: " + storeId + " no se encuntra registrado en la DB: " + dbuserid);
      return res.status(404).json({
        message: "MENSAJE: (34453) el storeId: " + storeId + " no se encuntra registrado en la DB: " + dbuserid
      });
      }
    }
  } catch (error) {
    console.log("MENSAJE: Hubo un error al intentar acceder a la DB " + dbuserid);
    console.log(error)
    return res.status(500).json(error);
  }


  try {  
    const listaFound = await config.globalConnectionStack[dbuserid].listadeprecios.find({storeId:storeId})
    .populate("ldpProducts.product")
    .populate("ldpProducts.product.categoriaRubro");
    if(listaFound){   
      console.log("MENSAJE: listas de precios encontradas para " + storeId);
      return res.status(200).json(listaFound)
    }else{
      console.log("MENSAJE: (3435) No existen Lista de precios para la store " + storeId + " - DB: " + dbuserid);
      return res.status(404).json({
        message: "MENSAJE: (3435) No existen Lista de precios para la store " + storeId + " - DB: " + dbuserid
      });
    }    

  } catch (error) {
    console.log("MENSAJE: Hubo un error al intentar acceder a la DB " + dbuserid);
    console.log(error)
    return res.status(500).json(error);
  }
}

/*
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
          return res.status(201).json(newLDPs._id);
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
*/
export const registrarNuevaLDP = async(req,res) => {
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  if(!dbuserid) return res.status(400).json("ERROR: No dbuserid. dbuserid Expected");

  var params = req.body;
  console.log("el req.body-------------------------")
  console.log(params)

  console.log("MENSAJE: Registrando nueva lista de precios para db " + dbuserid)

  let arrayProductosOfLDP = []
  for (let producto of params.products) {
    console.log("esto es un produccccccccc")
    console.log(producto)
    let objldpproduct = {
      product: producto._id,
      precioVenta: producto.precioVenta
    }
      
    arrayProductosOfLDP.push(objldpproduct)
  }
 

  var listadeprecios = new ListaDePrecios();
  listadeprecios.listaNombre = params.listaNombre;
  listadeprecios.descripcion = params.descripcion;
  listadeprecios.ldpProducts = arrayProductosOfLDP;
  listadeprecios.creadapor = params.creadapor;
  listadeprecios.fechaDeCreacion = params.fechaDeCreacion;
  listadeprecios.storeId = params.storeId;

  if(!listadeprecios.listaNombre) return res.status(400).json("ERROR: No listaNombre. listaNombre Expected - Imposible registrar nueva lista de precios");
  if(!listadeprecios.descripcion) return res.status(400).json("ERROR: No descripcion. descripcion Expected - Imposible registrar nueva lista de precios");
  if(!listadeprecios.ldpProducts) return res.status(400).json("ERROR: No products. products Expected - Imposible registrar nueva lista de precios");
  if(!listadeprecios.creadapor) return res.status(400).json("ERROR: No creadapor. creadapor Expected - Imposible registrar nueva lista de precios");
  if(!listadeprecios.fechaDeCreacion) return res.status(400).json("ERROR: No fechaDeCreacion. fechaDeCreacion Expected - Imposible registrar nueva lista de precios");
  if(!listadeprecios.storeId) return res.status(400).json("ERROR: No storeId. storeId Expected - Imposible registrar nueva lista de precios");


  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  try {

    const ldpFound = await config.globalConnectionStack[dbuserid].listadeprecios.findOne({ listaNombre: listadeprecios.listaNombre });
    if(ldpFound) return res.status(400).json("MENSAJE: Ya existe una lista de precios con el nombre " + listadeprecios.listaNombre + " en " + dbuserid + " database");

    //PASO 1: Crear el registro en la DB
    const saveLdps = Promise.resolve(config.globalConnectionStack[dbuserid].listadeprecios(listadeprecios).save());
        saveLdps.then((newLDPs) => {
            console.log("la saveLdps")
            console.log(newLDPs)
            console.log("MENSAJE: Lista de Producto guardado exitosamente en " + dbuserid +":listadeprecios colection")
            
            //PASO 2: asociar el registro creado a la store.
            const updatedStore = Promise.resolve(storeControler.addListadpToStore(dbuserid, listadeprecios.storeId, newLDPs._id))
            updatedStore.then((response)=>{
              if(!response){
                // hay que hacer un rolback y eliminar el registro de LDP
                console.log("ERROR: Ha ocurrido un error al intentar asosciar la lista de precios " + newLDPs._id + " a la store " + listadeprecios.storeId)
                console.log(("MENSAJE: Intentando eliminar lista de precios ID: " + newLDPs))
                const registroEliminado = deleteListadeprecios(dbuserid, newLDPs._id)
                registroEliminado.then((response)=>{
                  if(response){
                    return res.status(500).json("ERROR: No se ha podido crear la nueva lista de precios");
                  }else{
                    return res.status(500).json("ERROR: No se ha podido crear la nueva lista de precios. No se pudo eliminar el registro creado " + newLDPs._id);
                  }
                })
                
              }else{
                console.log("SUCCESSFULL: La lista de precios " + newLDPs._id + " ha sido asociada exitosamente a la Tienda " + listadeprecios.storeId)
                return res.status(201).json(newLDPs._id);
              }
            })          
            
            
        });

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }

}

export const deleteListadeprecios = async (dbuserid, listaId) => {
  if(!dbuserid) return false
  if(!listaId) return false

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  try {
    const deletedLDP = await config.globalConnectionStack[dbuserid].listadeprecios.findByIdAndDelete(listaId);
    deletedLDP.then((response)=>{
      if(response){
        console.log("MENSAJE: La lista de precioc " + listaId + " ha sido eliminada exitosamente de DB: " + dbuserid)
        return true
      }else{
        console.log("ERROR: La lista de precioc " + listaId + " NO HA PODIDO ELIMINARSE de DB: " + dbuserid)
        return false
      }
    })

  } catch (error) {
    console.log(error);
    return false
  }

}


export const ultimosRegistrosDeComprasXProductos = async(req, res) => {
  console.log("MENSAJE: ultimosRegistrosDeComprasXProductos() - Obteniendo ultimos registros de compras para los productos")
  const dbuserid = req.userDB
  const productosFound = productCtrl.getProductsForLDP(dbuserid);
  if(productosFound == false){
    console.log("MENSAJE: No existen productos en la coleccion de productos para esta tienda")
  }
}

export const getListaDpByIdAndPopulateProducts = async(req,res) => {
  const dbuserid = req.userDB
  
  console.log(req.params.listaId)

  const listaId = req.params.listaId
  console.log("MENSAJE: Obteniendo datos de lista de precio IDDD: " + listaId)

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  try {  
    const listaFound = await config.globalConnectionStack[dbuserid].listadeprecios.findById(listaId)
    .populate("products");
    if(listaFound){   
      console.log("MENSAJE: lista de precios encontrada " + listaId);
      return res.status(200).json(listaFound)
    }else{
      console.log("MENSAJE: (767888888)Lista de precios " + listaId + " not found for DB " + dbuserid);
      return res.status(404).json({
        message: "MENSAJE:(767888888)Lista de precios " + listaId + " not found for DB " + dbuserid
      });
    }    

  } catch (error) {
    console.log("MENSAJE: Hubo un error al intentar acceder a la DB " + dbuserid);
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