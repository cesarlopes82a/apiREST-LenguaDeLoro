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
  