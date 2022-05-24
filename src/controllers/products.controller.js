import Product from "../models/Product";
import config from "../config";
import * as storeControler from "./stores.controller";
import * as userconnection from "../libs/globalConnectionStack";

export const createProduct = async (req, res) => {
  console.log("vengo a crear/agregar un nuevo producto")
  const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  var storeId = req.body.storeId
  console.log("el sssssttttttooooorreeeeeeID: " + storeId)
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
    producto.storeId = params.storeId


    if (await codigoCargado(dbuserid,params.codigo, storeId)){
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

export const codigoCargado = async (dbuserid, codigo, storeId) => {
  // me traigo toda la lista de branches que tiene agregada la tienda y la buardo dentro del "array branches"
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }
  
  const codigoExistente = await config.globalConnectionStack[dbuserid].product.find({
    "codigo":codigo,
    "storeId":storeId
  });
  console.log(codigoExistente.length)
  if (codigoExistente.length>0){
    return true
  } else{
    return false
  }
}

export const getProductById = async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  res.status(200).json(product);
};


export const getProductosByStoreId = async (req, res) => {
  const dbuserid = req.userDB;
  let storeId = req.params.storeId;

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  //tengo que verificar si lo que me pasan como storeId es realmente el storeId o es una branchId para buscar su storeId
  const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
  console.log("---------las storeFound")
  console.log(storeFound)
  if(storeFound){
    console.log(storeFound)
  }else{
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(storeId);
    console.log("---------las branchFound")
    console.log(branchFound)
    if(branchFound){
      storeId=branchFound.storeId
    }
  }
  console.log("MENSAJE: getProductosByStoreId() - " + storeId )
  const productsFound = await config.globalConnectionStack[dbuserid].product.find({ "storeId": storeId });
  res.status(200).json(productsFound);
};

export const getProductosByStoreIdAndPopulate = async (req, res) => {
  const dbuserid = req.userDB;
  let storeId = req.params.storeId;

  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  //tengo que verificar si lo que me pasan como storeId es realmente el storeId o es una branchId para buscar su storeId
  const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
  console.log("---------las storeFound")
  console.log(storeFound)
  if(storeFound){
    console.log(storeFound)
  }else{
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(storeId);
    console.log("---------las branchFound")
    console.log(branchFound)
    if(branchFound){
      storeId=branchFound.storeId
    }
  }
  console.log("MENSAJE: getProductosByStoreIdAndPopulate() - " + storeId )
  const productsFound = await config.globalConnectionStack[dbuserid].product.find({ "storeId": storeId })
  .populate("ultimoRegCompra")
  .populate("categoriaRubro");
  res.status(200).json(productsFound);
};

export const getProducts = async (req, res) => {
  
  const dbuserid = req.userDB;
  console.log("getProducts " + dbuserid )
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  const productsFound = await config.globalConnectionStack[dbuserid].product.find();
  res.status(200).json(productsFound);

};


export const getProductsForLDP = async (dbuserid) => {
  
  console.log("MENSAJE: getProductsForLDP() - " + dbuserid )
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  }

  const productsFound = await config.globalConnectionStack[dbuserid].product.find()
  .populate("categoriaRubro");
  if(productsFound.length == 0){
    return false
  }
  return productsFound;
};


export const updateProductById = async (req, res) => {
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.productId,
    req.body,
    {
      new: true,
    }
  );
  res.status(204).json(updatedProduct);
};

export const actualizarUltimoRegCompra = async(dbuserid, productId, compraId, cantidad) =>{
  if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
    await userconnection.checkandcreateUserConnectionStack(dbuserid);
  };
  try {
    const productFound = await config.globalConnectionStack[dbuserid].product.findById(productId);
    if(!productFound) return false
  
    productFound.ultimoRegCompra = compraId;
    productFound.stock = productFound.stock + cantidad;
    
    const updatedProduct = await config.globalConnectionStack[dbuserid].product.findByIdAndUpdate(
      productId,
      productFound,
      {
        new: true,
      }
    )
    return updatedProduct; 
  } catch (error) {
    console.log("MENSAJE: Ha ocurrido un error al intentar actualzar el producto con el ultimo registro de compra")
    console.log(error)
    return false
  }
  
};

export const deleteProductById = async (req, res) => {
  const { productId } = req.params;

  await Product.findByIdAndDelete(productId);

  // code 200 is ok too
  res.status(204).json();
};



