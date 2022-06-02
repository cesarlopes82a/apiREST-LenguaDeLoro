import Compra from "../models/Compra";
import config from "../config";
import * as branchCtrl from "./branch.controller.js";
import * as productCtrl from "./products.controller";
import * as userconnection from "../libs/globalConnectionStack";

export const registrarCompra = async (req, res) => {
    console.log("registrarCompra() - vengo a registrar ingreso de mercaderias ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
  
    //const { branchId, productId, userId, proveedorId, cantidad, precioCompraUnitario, fechaDeCompra, fechaDeVencimiento, comentario } = req.body; 

    var registroCompra = new Compra();
    //para recoger los parametros que me llegan por el body de la peticion
    var params = req.body;
    
    registroCompra.productId = params.productId;
    registroCompra.userId = params.userId;
    registroCompra.proveedorId = params.proveedorId;
    registroCompra.branchId = params.branchId;
    registroCompra.cantidad = params.cantidad;
    registroCompra.precioCompraUnitario = params.precioCompraUnitario;
    registroCompra.fechaDeCompra = params.fechaDeCompra;
    registroCompra.fechaDeVencimiento = params.fechaDeVencimiento;
    registroCompra.comentario = params.comentario;

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
   
    const productFound = await config.globalConnectionStack[dbuserid].product.findById(params.productId)
    if(!productFound) return res.status(403).json("(4565)Error: el producto " + params.productId + " NO existe en la coleccion de PRODUCTOS.");

    const userFound = await config.globalConnectionStack[dbuserid].user.findById(params.userId)
    if(!userFound) return res.status(403).json("(4565)Error: el usuario " + params.userId + " NO existe en la coleccion de USUARIOS.");

    const proveedorFound = await config.globalConnectionStack[dbuserid].proveedor.findById(params.proveedorId)
    if(!proveedorFound) return res.status(403).json("(4565)Error: el proveedor " + params.proveedorId + " NO existe en la coleccion de PROVEEDORES.");

    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(params.branchId)
    if(!branchFound) return res.status(403).json("(4565)Error: La sucursal " + params.branchId + " NO existe en la coleccion de SUCURSALES/BRANCHES.");
    
    try {
        // PASO 1 : - CREAR EL REGISTRO DE COMPRA EN LA COLECCION DE COMPRAS DE LA DB. 
        const registrarCompra = () => {
            return new Promise((resolve, reject) => {
                const newCompra = new config.globalConnectionStack[dbuserid].compra(registroCompra).save()
                if(newCompra){
                    console.log("MENSAJE: - registrarCompra(): Registro de compra generado exitosamente")
                    resolve(newCompra)
                }else{
                    console.log("MENSAJE: - registrarCompra(): Error al intentar generar el nuevo registro de compra")
                    reject(new Error("Error al intentar generar el nuevo registro de compra"))
                }
            })
        }
        async function registrandoCompra(){
            try {
                const compraRegistrada = await registrarCompra()
                if(compraRegistrada){
                    console.log("MENSAJE: registrandoCompra() - compra registrada con exito " + compraRegistrada._id)
                    return compraRegistrada
                }else return false             
            } catch (error) {
                console.log("ERROR(54654722): " + error.message)
            }
        }

        const nuevaCompraRegistrada = await registrandoCompra()

        // PASO 1: - FIN DE PASO 1

        
        if(nuevaCompraRegistrada){            
            // PASO 2: - ASOCIAR EL NUEVO REGISTRO DE COMPRA QUE ACABO DE CREAR A LA SUCURSAL QUE REALIZÓ LA COMPRA
            const asociarCompraBranch = () => {
                return new Promise((resolve, reject) => {
                    console.log("MENSAJE: asociarCompraBranch() - asociando registro de compra " + nuevaCompraRegistrada._id + " a la sucursal " + params.branchId)
                    Promise.resolve(branchCtrl.registrarNewCompra(dbuserid, params.userId, params.branchId, nuevaCompraRegistrada._id))
                    .then((response) => {
                        if(response == false){
                            console.log("ERROR(135435): Ha ocurrido un error al intentar asociar el registro de compra al la sucursal. Intentando eliminar registro de compra " + nuevaCompraRegistrada._id + "...")
                            //ROLLBACK!!!
                            reject(new Error("Error al intentar ASOSCIAr el nuevo registro de compra a la sucursal"))
                        }else{
                            console.log("MENSAJE: asociarCompraBranch() - Registro de compra ASOCIADO exitosamente a la sucursal")
                            resolve(response)
                        }

                    })                    
                })
            }

            async function asociandoCompraBranch(){
                console.log("MENSAJE: asociandoCompraBranch() - asociando registro de compra " + nuevaCompraRegistrada._id + " a la sucursal " + params.branchId)
                try {
                    const compraAsociada = await asociarCompraBranch()
                    .then((response)=>{
                        console.log("MENSAJE: compra ASOCIADA con exito a la sucursalllll")
                        return response
                    })
                    .catch((error)=>{
                        console.log(error.message)
                        return false
                    })
                    return compraAsociada
                    
                } catch (error) {
                    console.log("ERROR(3454656): " + error.message) 
                }
            }

            const compraAsociadaSucursal = await asociandoCompraBranch()
            .then((response)=>{
                console.log("veo que nos lleg a aca")
                console.log(response)
                return response    
            }).catch((error)=>{
                console.log(error.message)
                return false
            })
        
            // PASO 2: - FIN DE PASO 2
            
            async function deshacerPaso2(){
                console.log("ERROR(354535): Ha ocurrido un error al intentar asociar el registro de compra al la sucursal. Intentando eliminar registro de compra " + nuevaCompraRegistrada._id + "...")
                config.globalConnectionStack[dbuserid].compra.findByIdAndDelete(nuevaCompraRegistrada._id, function (err, docs) {
                    if (err){
                        console.log("ERROR(112342): Ha ocurrido un error al intentar eliminar el registro de compra " + nuevaCompraRegistrada._id)
                        console.log(err)
                        return res.status(400).json("ERROR(112342): dberror - La operacion de registro de compra no pudo ser completada. verifique!");
                    }
                    else{
                        console.log("ELIMINADO : ", docs);
                        return res.status(400).json("ERROR(68623): compraAsociadaSucursal=false - La operacion de registro de compra no pudo ser completada!");
                    }
                });
            }

            // PASO 2": - VERIFICO SI TENGO QUE HACER UN rolback del paso 2
            if(compraAsociadaSucursal == false){
                deshacerPaso2()
            }else{
                // PASO 3: ACTUALIZO EL STOCK DE MERCADERIAS PARA AGREGAR LOS PRODUCTOS INGRESADOS            
                console.log("MENSAJE: registrarCompra() - Iniciando proceso de actualizacion de Stock de mercaderias")
                Promise.resolve(branchCtrl.actualizarStock(dbuserid, params.userId, params.branchId, params.productId, params.cantidad, "agregar"))
                .then((response) => {
                    if(response == false){
                        console.log("ERROR(4355): actualizarStock() - Ha ocurrido un error al intentar actualizar el STOCK de mercaderias")
    
                        return res.status(400).json("ERROR(4355): actualizarStock() - Ha ocurrido un error al intentar actualizar el STOCK de mercaderias. No se puede registrar la compra");
                        //ROLLBACK pendiente!!!  tengo qe eliminar el registro de compra y desasociarlo de la branch/sucursal
                    }else{
                        console.log("MENSAJE: actualizarStock() - El Stock ha sido actualizado con exito!")
                        //return res.status(201).json("SUCCESS!: La nueva compra ha sido registrada con exito!");
                    }
                }) 
                // PASO 3: - FIN DE PASO 3
            };

            // PASO 4: ASOCIAR EL NUEVO REGISTRO DE COMPRA QUE ACABO DE CREAR A LA PRODUCTO. TENGO QUE ACTUALIZAR EL "ULTIMO REGISTRO DE COMPRA"
            if(compraAsociadaSucursal == false){

            }else{
                console.log("MENSAJE: registrarCompra() - Iniciando proceso de actualizacion de Producto - Ultimo Registro de compra")
                Promise.resolve(productCtrl.actualizarUltimoRegCompra(dbuserid, params.productId, nuevaCompraRegistrada._id, params.cantidad))
                .then((response) =>{
                    if(response == false){
                        console.log("ERROR(2421): actualizarUltimoRegCompra() - Ha ocurrido un error al intentar actualizar el ultimo reg de compras para el producto:  " + params.productId)
                        return res.status(400).json("ERROR(2421): actualizarUltimoRegCompra() - Ha ocurrido un error al intentar actualizar el ultimo reg de compras para el producto:  " + params.productId);
                        //ROLLBACK pendiente!!!  tengo qe eliminar el registro de compra y desasociarlo de la branch/sucursal
                    }else{
                        console.log("MENSAJE: actualizarUltimoRegCompra() - Ultimo registro de compra actualizado con exito para: " + params.productId)
                        return res.status(201).json("SUCCESS!: La nueva compra ha sido registrada con exito!");
                    }
                })
            }

            // PASO 2": - FIN DE PASO 2"

            // PASO
            
               

        }else {
            console.log("ERROR: Paso 2")
        }
        

    } catch (error) {
        console.log("ERROR: Catch paso 1")
        console.log("registrarCompra() - ERROR(234354): Hubo un error al intentar registrar nueva compra")
        console.log(error)
        return res.status(403).json("registrarCompra() - ERROR(234354): Hubo un error al intentar registrar nueva compra");
    }
};
export const getCompras = async (req, res) => {
    
    const dbuserid = req.userDB;
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    const comprasFound = await config.globalConnectionStack[dbuserid].compra.find();
    res.status(200).json(comprasFound);
};
export const getComprasByBranch = async (req, res) => {
    const dbuserid = req.userDB;
    const branchid  = req.params.branchId;
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    const comprasFound = await config.globalConnectionStack[dbuserid].compra.find({branchId: branchid})
    if(!comprasFound){ console.log("MENSAJE(45646): No existen compras registradas para la sucursal " + branchId); return false } 
    
    res.status(200).json(comprasFound);
};
export const getComprasByBranchAndPopulateInfo = async (req, res) => {
    const dbuserid = req.userDB;
    const branchid  = req.params.branchId;
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    console.log("el branch id: " + branchid)
    const comprasFound = await config.globalConnectionStack[dbuserid].compra.find({branchId: branchid})
    .populate("productId")
    .populate("userId")
    .populate("proveedorId")
    .populate("branchId")
    console.log(" las comprasFound")
    console.log(comprasFound)
    if(!comprasFound){ console.log("MENSAJE(776): No existen compras registradas para la sucursal " + branchId); return false } 
    
    res.status(200).json(comprasFound);
};