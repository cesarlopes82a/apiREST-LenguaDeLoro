import config from "../config";
import * as userconnection from "../libs/globalConnectionStack";

export const createCategory = async (dbuserid, categoryName) => {
    console.log("voy a intentar crear una categoria nueva ->" + categoryName +"<- para: " + dbuserid)
    if(categoryName){
        //Me fijo si ya tengo cargado el stack de coneccion y si no esta cargado, lo cargo    
        if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
            console.log("creo el stack de coneccion al intentar crear las categorias")
            checkandcreateUserConnectionStack(dbuserid);
        }
        try {
            const values = await Promise.all([
                new config.globalConnectionStack[dbuserid].category({ categoryName: categoryName }).save(),
            ]);    
            console.log(values)
        } catch (error) {
            console.log("(234354) Hubo un error al intentar crear la categoria " + categoryName )
            console.log(error)
        }
    }else{
        return res.status(401).json({
            message: "(567) Error: No se recibe el nombre de la categoria para crear",
        });
    }

};

export const createNewCategory = async (req, res) => {
    //a diferencia de createCategory, aca tambien atacho la categoria a una tienda.
    console.log("MENSAJE: categoryController - createNewCategory().... ")
    console.log(req.body)

    const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
    if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
        console.log("ERROR: changeStatusProductById() - dbuserid formato inválido. Imposible cambiar estado del producto!")
        return res.status(400).json("ERROR: changeStatusProductById() - dbuserid formato inválido. Imposible cambiar estado del producto!");
    } 
    if(!dbuserid){
    console.log("ERROR: changeStatusProductById() - No dbuserid. dbuserid Expected - Imposible cambiar estado del producto!")    
    return res.status(400).json("ERROR: changeStatusProductById() - No dbuserid. dbuserid Expected - Imposible cambiar estado del producto!");
    } 


    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }


    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(req.body.storeId)
    .populate("categoriaRubro")
    if(!storeFound){
        console.log("ERROR: storeId: " + req.body.storeId + " no existe en dbuserid:"+dbuserid+". Imposible crear nueva categoria!" )
        return res.status(400).json("ERROR: storeId: " + req.body.storeId + " no existe en dbuserid:"+dbuserid+". Imposible crear nueva categoria!");
    }

    const categoryFound = await config.globalConnectionStack[dbuserid].category.find({categoryName: req.body.categoryName});
    if(categoryFound.length > 0 ){
        for (let i=0; i<storeFound.categoriaRubro.length; i++){
            if(String(storeFound.categoriaRubro[i].categoryName) == req.body.categoryName){                
                console.log("ERROR: la categoría " + req.body.categoryName + " ya está registrada en esta tienda. proceso terminado.")
                return res.status(400).json("ERROR: la categoría " + req.body.categoryName + " ya está registrada en esta tienda. Verifique!")                
            }
        }

        //si llego acá es porque la categoria existe pero aun no ha sido asignada a la tienda. ASIGNO CATEGORIA A LA TIENDA
        storeFound.categoriaRubro.push(categoryFound[0])
        try {
            const storeUpdated = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
              req.body.storeId,
              storeFound,
              {
                new: true,
              }
            )
            if(storeUpdated){
              console.log("MENSAJE: Categoria " + req.body.categoryName + " añadida exisosamente storeId: " + req.body.storeId + " - dbuserid: " + dbuserid )
              return res.status(200).json("MENSAJE: Categoria " + req.body.categoryName + " añadida exisosamente storeId: " + req.body.storeId + " - dbuserid: " + dbuserid );
            }
        } catch (error) {
        console.log(error)
        console.log("ERROR: Ha ocurrido un error al intentar actualizar storeId: " +req.body.storeId+ " - dbuserid: " + dbuserid )
        return res.status(500).json("ERROR: Ha ocurrido un error al intentar actualizar storeId: " +req.body.storeId+ " - dbuserid: " + dbuserid )
        }
      } else{
        //tengo que crear la nueva categoria!
        try {
                const result = await Promise.all([
                new config.globalConnectionStack[dbuserid].category({ categoryName: req.body.categoryName }).save(),
            ]);    
            console.log(result)
            storeFound.categoriaRubro.push(result[0])
            const storeUpdated = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
                req.body.storeId,
                storeFound,
                {
                  new: true,
                }
            )
            if(storeUpdated){
            console.log("MENSAJE: Categoria " + req.body.categoryName + " añadida exisosamente storeId: " + req.body.storeId + " - dbuserid: " + dbuserid )
            return res.status(200).json("MENSAJE: Categoria " + req.body.categoryName + " añadida exisosamente storeId: " + req.body.storeId + " - dbuserid: " + dbuserid );
            }

        } catch (error) {
            console.log("ERROR: Ha ocurrido un error al intentar crear la categoria: " +req.body.categoryName+ ". storeId:"+req.body.storeId+" - dbuserid: " + dbuserid )            
            console.log(error)
        }

      }
    

}

//Buscamos todas las tiendas
export const getCategories = async (req, res) => {
    console.log("esto es el getCategories")
    const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
    console.log("el req.userDB " + req.userDB)
    if (!dbuserid) return res.status(408).json({ message: "No dbuserid ID provided" });
  
    try {
      if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
      }
      const categoryFound = await config.globalConnectionStack[dbuserid].category.find();
      if(!categoryFound) return res.status(403).json({ message: "No category found for " + dbuserid + " user"  });
  
      res.status(200).json(categoryFound);
  
    } catch (error) {
      console.log(error);
      return res.status(500).json(error);
    }
  };

  export const getCategoriasByStoreId = async (req, res) => {
    console.log("MENSAJE: categoryController - getCategoriasByStoreId().... ")
    console.log(req.body)
    console.log(req.params)

    const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
    if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
        console.log("ERROR: getCategoriasByStoreId() - dbuserid formato inválido. Imposible listar categorias!")
        return res.status(400).json("ERROR: getCategoriasByStoreId() - dbuserid formato inválido. Imposible listar categorias!");
    } 
    if(!dbuserid){
    console.log("ERROR: getCategoriasByStoreId() - No dbuserid. dbuserid Expected - Imposible listar categorias!")    
    return res.status(400).json("ERROR: getCategoriasByStoreId() - No dbuserid. dbuserid Expected - Imposible listar categorias!");
    } 

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }

    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(req.params.storeId)
    .populate("categoriaRubro")
    if(!storeFound){
        console.log("ERROR: storeId: " + req.params.storeId + " no existe en dbuserid:"+dbuserid+". Imposible listar categorias!" )
        return res.status(400).json("ERROR: storeId: " + req.params.storeId + " no existe en dbuserid:"+dbuserid+". Imposible listar categorias!");
    }

    res.status(200).json(storeFound.categoriaRubro);
  };

  export const eliminarCategoria = async (req, res) => {
    //las categorias se crean dentro de la coleccion categories y luego se atachan a la tienda/store en el array de categoriaRubro
    
    console.log("MENSAJE: categoryController - eliminarCategoria().... ")
    let params = JSON.parse(req.query.param)
    console.log(params)

    const dbuserid = req.userDB;  //dbuserid me dice en que db tengo que escribir
    if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
        console.log("ERROR: eliminarCategoria() - dbuserid formato inválido. Imposible eliminar categoria!")
        return res.status(400).json("ERROR: eliminarCategoria() - dbuserid formato inválido. Imposible eliminar categoria!");
    } 
    if(!dbuserid){
    console.log("ERROR: eliminarCategoria() - No dbuserid. dbuserid Expected - Imposible eliminar categoria!")    
    return res.status(400).json("ERROR: eliminarCategoria() - No dbuserid. dbuserid Expected - Imposible eliminar categoria!");
    } 

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }

    const storeFound = await config.globalConnectionStack[dbuserid].store.findById(params.storeId)
    if(!storeFound){
        console.log("ERROR: storeId: " + params.storeId + " no existe en dbuserid:"+dbuserid+". Imposible eliminar categoria!" )
        return res.status(400).json("ERROR: storeId: " + params.storeId + " no existe en dbuserid:"+dbuserid+". Imposible eliminar categoria!");
    }

    const categoryFound = await config.globalConnectionStack[dbuserid].category.findById(params.categoriaId)
    if(!categoryFound){
        console.log("ERROR: categoriaId: " + params.categoriaId + " no existe en dbuserid:"+dbuserid+". Imposible eliminar categoria!" )
        return res.status(400).json("ERROR: categoriaId: " + params.categoriaId + " no existe en dbuserid:"+dbuserid+". Imposible eliminar categoria!");
    }

    const productsFoundInStore = await config.globalConnectionStack[dbuserid].product.find({categoriaRubro:params.categoriaId, storeId: params.storeId})
    if(productsFoundInStore.length > 0){
        return res.status(403).json("ERROR: Existen productos que aún pertenecen a esta categoria. Verifique! Imposible eliminar categoria!");
    }
    //veo de eliminar la categoria del array de categoriaRubo del la tienda/store
    for(let i=0; i<storeFound.categoriaRubro.length; i++){
        if(String(storeFound.categoriaRubro[i]) == params.categoriaId){
            const filteredCategorias = storeFound.categoriaRubro.filter((item) => String(item) !== String(params.categoriaId))
            storeFound.categoriaRubro = filteredCategorias.slice()
            try {
                console.log("MENSAJE: Actualizando storeFound.categoriaRubro para storeId: " + params.storeId)
                const storeUpdated = await config.globalConnectionStack[dbuserid].store.findByIdAndUpdate(
                    params.storeId,
                    storeFound,
                    {
                        new: true,
                    }
                )
               if(storeUpdated){
                console.log("MENSAJE: storeId: " + params.storeId + " actualizada exitosamente!! - dbuserid: " + dbuserid )
               }
            } catch (error) {
                console.log(error)
                console.log("ERROR: algo salió mal al intentar eliminar actualizar el registro de categoriaRubro para storeId:" + params.storeId)
                return res.status(500).json("ERROR: algo salió mal al intentar eliminar actualizar el registro de categoriaRubro para storeId:" + params.storeId)
            }
        }
    }

    //si además, no existen productos que esten asociados a esta categoria, elimino la caregoria de la coleccion de categorias.

    const productsFound = await config.globalConnectionStack[dbuserid].product.find({categoriaRubro:params.categoriaId})
    if(productsFound.length == 0){
        try {
            const categoriaDeleted = await config.globalConnectionStack[dbuserid].category.findByIdAndDelete(params.categoriaId)
            if(categoriaDeleted){
                console.log("MENSAJE: categoriaId:" + params.categoriaId + " eliminada exitosamente!")                
            } 
    
        } catch (error) {
            console.log("ERROR: No se pudo eliminar registro! algo salió mal al intentar eliminar categoriaId:"+params.categoriaId+" - dbuserid: " + dbuserid)
            return res.status(500).json("ERROR: No se pudo eliminar registro! algo salió mal al intentar eliminar categoriaId:"+params.categoriaId+" - dbuserid: " + dbuserid);
        }
        
    }

    return res.status(200).json("MENSAJE: Proceso finalizado exitosamente!");
    


  }
  