import config from "../config";

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
