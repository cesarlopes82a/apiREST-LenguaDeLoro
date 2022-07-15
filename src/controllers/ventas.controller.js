import Venta from "../models/Venta";
import config from "../config";
import * as branchCtrl from "./branch.controller.js";
import * as productCtrl from "./products.controller";
import * as userconnection from "../libs/globalConnectionStack";



export const registrarVenta = async (req, res) => {
    console.log("MENSAJE: registrarVenta1() - vengo a registrar UNA nueva venta")
   
 const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
    var params = req.body;   
    var registroVenta = new Venta();
    registroVenta.branchId = params.branchId
    registroVenta.userId = params.vendedorId
    registroVenta.productosVendidos = params.listaDeProductos
    registroVenta.totalVta = params.totalVenta
    registroVenta.montoEfectivo = params.montoEfectivo
    registroVenta.montoTarjeta = params.montoTarjeta
    registroVenta.totalMontoPendiente = params.totalVenta - params.montoEfectivo - params.montoEfectivo
    registroVenta.comentarioVta = params.comentarioVenta

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }

    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(params.branchId)
    if(!branchFound) return res.status(403).json("(35)Error: La sucursal " + params.branchId + " NO existe en la coleccion de SUCURSALES/BRANCHES.");

    const userFound = await config.globalConnectionStack[dbuserid].user.findById(params.vendedorId)
    if(!userFound) return res.status(403).json("(894)Error: el usuario " + params.userId + " NO existe en la coleccion de USUARIOS.");
    
    try {
        // PASO 1 : - CREAR EL REGISTRO DE COMPRA EN LA COLECCION DE COMPRAS DE LA DB. 
        const registrarVentaendb = () => {
            return new Promise((resolve, reject) => {
                const newVenta = new config.globalConnectionStack[dbuserid].venta(registroVenta).save()
                if(newVenta){
                    console.log("MENSAJE: - registrarVenta(): Registro de venta generado exitosamente")
                    resolve(newVenta)
                }else{
                    console.log("MENSAJE: - registrarVenta(): Error al intentar generar el nuevo registro de venta")
                    reject(new Error("ERROR: Error al intentar generar el nuevo registro de venta"))
                }
            })
        }
        async function registrandoVenta(){
            try {
                const ventaRegistrada = await registrarVentaendb()
                if(ventaRegistrada){
                    console.log("MENSAJE: registrandoCompra() - venta registrada con exito " + ventaRegistrada._id)
                    return ventaRegistrada
                }else return false             
            } catch (error) {
                console.log("ERROR(54654722): " + error.message)
            }
        }

        const nuevaVentaRegistrada = await registrandoVenta()

        // PASO 1: - FIN DE PASO 1

        if(nuevaVentaRegistrada)
        {
            // PASO 2: - ASOCIAR EL NUEVO REGISTRO DE VENTA QUE ACABO DE CREAR A LA SUCURSAL QUE REALIZÓ LA VENTA
            const asociarVentaBranch = () => {
                return new Promise((resolve, reject) => {
                    console.log("MENSAJE: asociarVentaBranch() - asociando registro de Venta " + nuevaVentaRegistrada._id + " a la sucursal " + params.branchId)
                    Promise.resolve(branchCtrl.registrarNewVenta(dbuserid, params.vendedorId, params.branchId, nuevaVentaRegistrada._id))
                    .then((response) => {
                        if(response == false){
                            console.log("ERROR(135435): Ha ocurrido un error al intentar asociar el registro de Venta al la sucursal. Intentando eliminar registro de Venta " + nuevaVentaRegistrada._id + "...")
                            //ROLLBACK!!!
                            reject(new Error("Error al intentar ASOSCIAR el nuevo registro de Venta a la sucursal"))
                        }else{
                            console.log("MENSAJE: asociarVentaBranch() - Registro de Venta ASOCIADO exitosamente a la sucursal")
                            resolve(response)
                        }

                    })                    
                })
            }

            async function asociandoVentaBranch(){
                console.log("MENSAJE: asociandoVentaBranch() - asociando registro de VENTA " + nuevaVentaRegistrada._id + " a la sucursal " + params.branchId)
                try {
                    const ventaAsociada = await asociarVentaBranch()
                    .then((response)=>{
                        console.log("MENSAJE: Venta ASOCIADA con exito a la sucursalllll")
                        return response
                    })
                    .catch((error)=>{
                        console.log(error.message)
                        return false
                    })
                    return ventaAsociada
                    
                } catch (error) {
                    console.log("ERROR(3454656): " + error.message) 
                }
            }

            const compraAsociadaSucursal = await asociandoVentaBranch()
            .then((response)=>{
                console.log("la venta")
                console.log(response)
                return response    
            }).catch((error)=>{
                console.log(error.message)
                return false
            })
        
            // PASO 2: - FIN DE PASO 2
            // PASO 2": - VERIFICO SI TENGO QUE HACER UN rolback del paso 2

            async function deshacerPaso2(){
                console.log("ERROR(354535): Ha ocurrido un error al intentar asociar el registro de Venta al la sucursal. Intentando eliminar registro de Venta " + nuevaVentaRegistrada._id + "...")
                config.globalConnectionStack[dbuserid].venta.findByIdAndDelete(nuevaVentaRegistrada._id, function (err, docs) {
                    if (err){
                        console.log("ERROR(112342): Ha ocurrido un error al intentar eliminar el registro de Venta " + nuevaVentaRegistrada._id)
                        console.log(err)
                        return res.status(400).json("ERROR(112342): dberror - La operacion de registro de Venta no pudo ser completada. verifique!");
                    }
                    else{
                        console.log("ELIMINADO : ", docs);
                        return res.status(400).json("ERROR(68623): ventaAsociadaSucursal=false - La operacion de registro de Venta no pudo ser completada!");
                    }
                });
            }

            if(compraAsociadaSucursal == false){
                deshacerPaso2()
            }else{

                //return res.status(201).json("SUCCESS!: La nueva VENTA ha sido registrada con exito!");
            };
            // PASO 3: Actualizar stock de productos vendidos
            //VEEEERRRR EL ROLBACK!!!!
            console.log("MENSAJE: Actializando stock de productos")
            for (let i = 0; i < registroVenta.productosVendidos.length; i++) {
                const index = branchFound.stock.findIndex(object => {
                    return String(object.product) == String(registroVenta.productosVendidos[i].productId);
                  });
                console.log(branchFound.stock[index])
                branchFound.stock[index].cantidad = branchFound.stock[index].cantidad - registroVenta.productosVendidos[i].cantidad
            }
            try {
                const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
                branchFound._id,
                branchFound,
                    {
                    new: true,
                    }
                );
                return res.status(201).json("SUCCESS!: La nueva VENTA ha sido registrada con exito!");    
            } catch (error) {
                console.log("registrarVenta() - ERROR(234): Hubo un error al intentar actualizar el stock!")
                console.log(error)
                return res.status(403).json("registrarVenta() - ERROR(234): Hubo un error al intentar actualizar el stock!");        
            }
            

        }

        
    } catch (error) {
        console.log("ERROR: Catch VENTA paso 1")
        console.log("registrarVenta() - ERROR(234354): Hubo un error al intentar registrar nueva venta")
        console.log(error)
        return res.status(403).json("registrarVenta() - ERROR(234354): Hubo un error al intentar registrar nueva venta");
    }

}

export const getVentas = async (req, res) => {
    
    const dbuserid = req.userDB;
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    const comprasFound = await config.globalConnectionStack[dbuserid].compra.find();
    res.status(200).json(comprasFound);
};
export const getVentasByBranch = async (req, res) => {
    const dbuserid = req.userDB;
    const branchid  = req.params.branchId;
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    const ventasFound = await config.globalConnectionStack[dbuserid].venta.find({branchId: branchid})
    if(!ventasFound){ console.log("MENSAJE(45646): No existen ventas registradas para la sucursal " + branchId); return false } 
    
    res.status(200).json(ventasFound);
};
export const getVentasByBranchAndPopulateInfo = async (req, res) => {
    const dbuserid = req.userDB;
    const branchid  = req.params.branchId;
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }
    const ventasFound = await config.globalConnectionStack[dbuserid].venta.find({branchId: branchid})
    .populate("branchId")
    .populate("userId")
    .populate("productosVendidos.rubro")
      

    
    if(!ventasFound){ console.log("MENSAJE(45646): No existen ventas registradas para la sucursal " + branchId); return false } 
    
    res.status(200).json(ventasFound);
};