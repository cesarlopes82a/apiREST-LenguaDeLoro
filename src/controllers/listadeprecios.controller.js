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
    .populate("creadapor")
    .populate("ldpProducts.product")
    .populate({ 
      path: 'ldpProducts.product',
      populate: {
        path: 'categoriaRubro',
        model: 'Category'
      } 
   })

   
    
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

export const registrarNuevaLDP = async(req,res) => {
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  if(!dbuserid) return res.status(400).json("ERROR: No dbuserid. dbuserid Expected");

  var params = req.body;
  console.log("el req.body-------------------------")
  console.log(params)

  console.log("MENSAJE: Registrando nueva lista de precios para db " + dbuserid)

  let arrayProductosOfLDP = []
  for (let producto of params.products) {
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

  //tengo que verificar si lo que me pasan como storeId es realmente el storeId o es una branchId para buscar su storeId
  const storeFound = await config.globalConnectionStack[dbuserid].store.findById(listadeprecios.storeId);
  if(storeFound){
    console.log(storeFound)
  }else{
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(listadeprecios.storeId);
    if(branchFound){
      listadeprecios.storeId=branchFound.storeId
    }
  }

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  try {

    const ldpFound = await config.globalConnectionStack[dbuserid].listadeprecios.findOne({ listaNombre: listadeprecios.listaNombre });
    if(ldpFound) return res.status(400).json("MENSAJE: Ya existe una lista de precios con el nombre " + listadeprecios.listaNombre + " en " + dbuserid + " database");

    //PASO 1: Crear el registro en la DB
    const saveLdps = Promise.resolve(config.globalConnectionStack[dbuserid].listadeprecios(listadeprecios).save());
        saveLdps.then((newLDPs) => {
            console.log("MENSAJE: Lista de Producto guardado exitosamente en " + dbuserid +":listadeprecios colection")
            
            //PASO 2: asociar el registro creado a la store.
            const updatedStore = Promise.resolve(storeControler.addListadpToStore(dbuserid, listadeprecios.storeId, newLDPs._id))
            updatedStore.then((response)=>{
              if(!response){
                // hay que hacer un rolback y eliminar el registro de LDP
                console.log("ERROR: Ha ocurrido un error al intentar asosciar la lista de precios " + newLDPs._id + " a la store " + listadeprecios.storeId)
              /*  console.log(("MENSAJE: Intentando eliminar lista de precios ID: " + newLDPs))
                const registroEliminado = deleteListadeprecios(dbuserid, newLDPs._id)
                registroEliminado.then((response)=>{
                  if(response){
                    return res.status(500).json("ERROR: No se ha podido crear la nueva lista de precios");
                  }else{
                    return res.status(500).json("ERROR: No se ha podido crear la nueva lista de precios. No se pudo eliminar el registro creado " + newLDPs._id);
                  }
                })
                */
                
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
  console.log("MENSAJE: Obteniendo datos de lista de precio IDDD-------------------: " + listaId)

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  try {  
    const listaFound = await config.globalConnectionStack[dbuserid].listadeprecios.findById(listaId)
    .populate("products")
   
    
    if(listaFound){   
      console.log("MENSAJE: lista de precios encontradaa " + listaId);
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



export const setDefaultStoreLDP = async(req,res) => {
  console.log("MENSAJE: Seteando default store Ldp")
  const dbuserid = req.userDB
  const itemMenuSeleccionadoId = req.params.itemMenuSeleccionadoId
  console.log(itemMenuSeleccionadoId)
  let { listaId } = req.body;
  if(!dbuserid) return res.status(400).json("ERROR: No dbuserid. dbuserid Expected - Imposible registrar lista de precios Default");
  if(!itemMenuSeleccionadoId) return res.status(400).json("ERROR: No target. target Expected - Imposible registrar lista de precios Default");
  if(!listaId) return res.status(400).json("ERROR: No listaId. listaId Expected - Imposible registrar lista de precios Default");
  //console.log("MENSAJE: Seteando default store Ldp para storeId: " + storeId + " - listaId: " + listaId + " - dbuserid: "+ dbuserid)
  
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  try {
    //verifico que exista la listaId que me estan pasando   
    const listaFound = await config.globalConnectionStack[dbuserid].listadeprecios.findById(listaId)
    if(!listaFound){
      console.log("ERROR: listaId: " +listaId+ " notFound. No se encontró la lista de precios!" )
      return res.status(400).json("ERROR: listaId: " +listaId+ " notFound. No se encontró la lista de precios! Verifique!");
    }


    //verifico si el itemMenuSeleccionadoId es una store o una branch
    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(itemMenuSeleccionadoId)
    if(storeFound){
      console.log("MENSAJE: el target es un storeId: " +storeFound._id+ ". Intentando setear default Lista de precios para la store!" )
      storeFound.defaultListaDP = listaId
      const storeUpdated = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
        storeFound._id,
        storeFound,
        {
          new: true,
        }
      );
      if(storeUpdated) return res.status(200).json(storeUpdated)
    }


    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(itemMenuSeleccionadoId)
    if(branchFound){
      console.log("MENSAJE: el target es un branchId: " +branchFound._id+ ". Intentando setear default Lista de precios para la sucursal!" )
      branchFound.defaultListaDP = listaId
      const branchUpdated = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
        branchFound._id,
        branchFound,
        {
          new: true,
        }
      );
      if(branchUpdated) return res.status(200).json(branchUpdated)
    }
    
    if(targetStoreOrBranch==""){
      console.log("ERROR: Target inexistente. No se ha podido encontrar una coincidencia de storeId ni de branchId. Imposible setear default Lista de precios!" )
      return res.status(400).json("ERROR: Target inexistente. No se ha podido encontrar una coincidencia de storeId ni de branchId. Imposible setear default Lista de precios!");
    }


  } catch (error) {
    console.error(error);
  }

}

export const eliminarListaDP = async(req,res) => {
  console.log("MENSAJE: Iniciando proceso de liminacion de lista de precios...")
  console.log(req.query.storeId)
  console.log(req.query.listaId)

  

  const dbuserid = req.userDB;
  if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
      console.log("ERROR: dbuserid formato inválido. Imposible obtener ventas!")
      return res.status(400).json("ERROR: dbuserid formato inválido. Imposible obtener ventas!");
  } 
  if(!dbuserid){
      console.log("ERROR: No dbuserid. dbuserid Expected - Imposible obtener ventas!")    
      return res.status(400).json("ERROR: No dbuserid. dbuserid Expected - Imposible obtener ventas!");
  }

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  const listaId = req.query.listaId
  if (!String(listaId).match(/^[0-9a-fA-F]{24}$/)){
    console.log("ERROR: listaId formato inválido. Imposible eliminar lista de precios!")
    return res.status(400).json("ERROR: listaId formato inválido. Imposible eliminar lista de precios!");
  } 

  const listaFound = await config.globalConnectionStack[dbuserid].listadeprecios.findById(listaId)
  if(!listaFound){
      console.log("ERROR: No listaFound. userId Expected - Imposible eliminar lista de precios!")
      return res.status(400).json("ERROR: No listaFound. listaFound Expected - Imposible eliminar lista de precios!");
  } 

  const ldpAssignedAsDefInBranch = await config.globalConnectionStack[dbuserid].branch.find({defaultListaDP:listaId})
  if(ldpAssignedAsDefInBranch.length > 0){
    console.log("ERROR: La lista de precios no puede ser eliminada ya que se encuentra asignada como ldp Default de una Sucursal!")
    return res.status(405).json("ERROR: La lista de precios no puede ser eliminada. Se encuentra asignada como ldp Default de una Sucursal");
  } 
  
  const ldpAssignedAsDefInStore = await config.globalConnectionStack[dbuserid].store.find({defaultListaDP:listaId})
  if(ldpAssignedAsDefInStore.length > 0){
    console.log("ERROR: La lista de precios no puede ser eliminada ya que se encuentra asignada como ldp Default de una Tienda!")
    return res.status(405).json("ERROR: La lista de precios no puede ser eliminada. Se encuentra asignada como ldp Default de una Tienda");
  } 

  try {
    const listaDeleted = await config.globalConnectionStack[dbuserid].listadeprecios.findByIdAndDelete(listaId, function (err, docs) {
      if (err){
        console.log("ERROR: eliminarListaDP("+ listaId +") - Ha ocurrido un error al intentar eliminar la lista de precios")    
        console.log(error)
        return res.status(500).json("ERROR: eliminarListaDP("+ listaId +") - Ha ocurrido un error al intentar eliminar la lista de precios");
      }
      else{
          console.log("ELIMINADO : ", docs);
        //  return res.status(400).json("ERROR(68623): compraAsociadaSucursal=false - La operacion de registro de compra no pudo ser completada!");
      }
  });
    
  } catch (error) {
    console.log("ERROR: eliminarListaDP("+ listaId +") - Ha ocurrido un error al intentar eliminar la lista de precios")    
    console.log(error)
    return res.status(500).json("ERROR: eliminarListaDP("+ listaId +") - Ha ocurrido un error al intentar eliminar la lista de precios");
  }

  return res.status(200).json(true)

}

