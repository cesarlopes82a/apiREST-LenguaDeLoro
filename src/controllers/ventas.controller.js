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
        // PASO 1 : - CREAR EL REGISTRO DE VENTA EN LA COLECCION DE VENTAS DE LA DB. 
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
                    console.log("MENSAJE: registrandoVenta() - venta registrada con exito " + ventaRegistrada._id)
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
                        console.log("la response")
                        console.log(response)
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
                console.log("Si todo fue bien tengo que actualizar el branchFound con la response")
                
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
            let actualizar = true
            const branchFoundUpdated = await config.globalConnectionStack[dbuserid].branch.findById(params.branchId)
            if(!branchFoundUpdated) return res.status(403).json("(35)Error: La sucursal " + params.branchId + " NO existe en la coleccion de SUCURSALES/BRANCHES.");
            for (let i = 0; i < registroVenta.productosVendidos.length; i++) {
                const index = branchFoundUpdated.stock.findIndex(object => {
                    console.log("veo esto")
                    console.log(object.product)
                    console.log(registroVenta.productosVendidos[i].productId)
                    return String(object.product) == String(registroVenta.productosVendidos[i].productId);
                  });
                  console.log(branchFoundUpdated.stock)
                console.log(branchFoundUpdated.stock[index])
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!")
                if(branchFoundUpdated.stock[index]){
                    branchFoundUpdated.stock[index].cantidad -= registroVenta.productosVendidos[i].cantidad
                } else{
                    actualizar = false
                }

            }
            try {
                if(actualizar = true){
                const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
                branchFoundUpdated._id,
                branchFoundUpdated,
                    {
                    new: true,
                    }
                );
                console.log("SUCCESS!: La nueva VENTA ha sido registrada con exito!")
                return res.status(201).json("SUCCESS!: La nueva VENTA ha sido registrada con exito!"); 
                } else{
                    console.log("WARNING!: NO existe registro de stock para este productId: "+registroVenta.productosVendidos[i].productId+ "branchId: "+params.branchId)
                    return res.status(201).json("WARNING!: NO existe registro de stock para este productId: "+registroVenta.productosVendidos[i].productId+ "branchId: "+params.branchId); 
                }
                   
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

export const getVentasForStatistics1 = async (req, res) => {
    console.log("MENSAJE: Obteniendo ventas for statistics...")
    //voy a obtener los totales de ventas por tienda y por sucursal
    const dbuserid = req.userDB;
    if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
        console.log("ERROR: dbuserid formato inválido. Imposible obtener ventas!")
        return res.status(400).json("ERROR: dbuserid formato inválido. Imposible obtener ventas!");
    } 
    if(!dbuserid){
        console.log("ERROR: No dbuserid. dbuserid Expected - Imposible obtener ventas!")    
        return res.status(400).json("ERROR: No dbuserid. dbuserid Expected - Imposible obtener ventas!");
    }

    const userId  = req.userId;
    if (!String(userId).match(/^[0-9a-fA-F]{24}$/)){
        console.log("ERROR: userId formato inválido. Imposible obtener ventas!")
        return res.status(400).json("ERROR: userId formato inválido. Imposible obtener ventas!");
    } 
    if(!userId){
        console.log("ERROR: No userId. userId Expected - Imposible obtener ventas!")
        return res.status(400).json("ERROR: No userId. userId Expected - Imposible obtener ventas!");
    } 

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }

    //Busco el user que me pasan en la db
    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
    .populate("tiendas")
    .populate("tiendas.branches")
    .populate({ 
        path: 'tiendas.store',
        populate: {
          path: 'store',
          model: 'Store'
        } 
     })
     .populate({ 
        path: 'tiendas.branches',
        populate: [{
          path: 'ventas',
          model: 'Venta',
          populate: {
            path    : 'userId',
            model: 'User',
            populate: {
                path    : 'roles',
                populate: 'Role'
               }
           }
        }]
     })
     
    if(!userFound) {
        console.log("(4565)ERROR: userId: "+userId+" No encontrado en dbuserid: "+dbuserid+". - Imposible obtener ventas!")
        return res.status(403).json("(4565)ERROR: userId: "+userId+" No encontrado en dbuserid: "+dbuserid+". - Imposible obtener ventas!");
    }

    /*
    {
        tiendaName:
        totalVentas:   
        sucursales:[
            {
                branchName:
                address:
                totalVentas:
                vendedores:[
                    {
                        username:
                        roleName:
                        totalVentas:
                    }
                ]
            }
        ]
    }
    */
    //recorro las tiendas que tiene asignada el user para generar los totales de ventas por tienda
    var totalesAgrupados = []
    for (let i = 0; i < userFound.tiendas.length; i++) {                
        var objTienda={
            tiendaName:userFound.tiendas[i].store.storeName,
            totalVentas: 0,
            totalEfectivo: 0,
            totalTarjeta: 0,
            cantVentas: 0,
            cantVentasEfectivo: 0,
            cantVentasTerjeta: 0,
            cantVtasPagoMixto: 0,
            sucursales: []
        }
        totalesAgrupados.push(objTienda)
        //recorro las sucursales que tiene asignada el user para generar los totales de ventas por sucursal
        for (let u = 0; u < userFound.tiendas[i].branches.length; u++) {
            var objSucursal={
                branchName: userFound.tiendas[i].branches[u].branchName,
                address: userFound.tiendas[i].branches[u].address,
                totalVentas: 0,
                totalEfectivo: 0,
                totalTarjeta: 0,
                cantVentas: 0,
                cantVentasEfectivo: 0,
                cantVentasTerjeta: 0,
                cantVtasPagoMixto: 0,
                vendedores: []
            }
            totalesAgrupados[i].sucursales.push(objSucursal)
            //recorro las ventas de la sucursal para generar los totales de ventas por vendedor
            for (let j = 0; j < userFound.tiendas[i].branches[u].ventas.length; j++) {
                //VOY A REVISAR SI YA PROCESÉ LAS VENTAS PARA EL USUARIO de esta venta
                console.log("inicio recorrido ventas")
                let ventasProcesadas = false
                for (let iV = 0; iV < totalesAgrupados[i].sucursales[u].vendedores.length; iV++) {
                    if(totalesAgrupados[i].sucursales[u].vendedores[iV].userId == userFound.tiendas[i].branches[u].ventas[j].userId._id ){
                        ventasProcesadas = true
                        console.log("las ventas de este vendedor ya fueron procesadas!")
                        console.log(ventasProcesadas)
                        break
                    }
                }
                console.log("termino recorrido ventas")
                console.log(ventasProcesadas)

                if(ventasProcesadas==false){
                    console.log("PROCESO VENTAS")
                    let objVendedores={
                        userId: userFound.tiendas[i].branches[u].ventas[j].userId._id,
                        username: userFound.tiendas[i].branches[u].ventas[j].userId.username,
                        roleName: userFound.tiendas[i].branches[u].ventas[j].userId.roles[0].roleName,
                        totalVentas: 0,
                        totalEfectivo: 0,
                        totalTarjeta: 0,
                        cantVentas: 0,
                        cantVentasEfectivo: 0,
                        cantVentasTerjeta: 0,
                        cantVtasPagoMixto: 0,
                    }
                    totalesAgrupados[i].sucursales[u].vendedores.push(objVendedores)
                    let index = totalesAgrupados[i].sucursales[u].vendedores.length - 1
                    const ventasVendedor = userFound.tiendas[i].branches[u].ventas.filter(function(venta){

                        if(venta.userId._id == objVendedores.userId){
                            console.log("sumo esto: " + venta.totalVta)

                            totalesAgrupados[i].sucursales[u].vendedores[index].totalVentas += venta.totalVta
                            totalesAgrupados[i].sucursales[u].totalVentas += venta.totalVta
                            totalesAgrupados[i].totalVentas += venta.totalVta

                            totalesAgrupados[i].sucursales[u].vendedores[index].cantVentas += 1
                            totalesAgrupados[i].sucursales[u].cantVentas += 1
                            totalesAgrupados[i].cantVentas += 1

                            if(venta.montoEfectivo >0 ){
                                totalesAgrupados[i].sucursales[u].vendedores[index].totalEfectivo += venta.montoEfectivo
                                totalesAgrupados[i].sucursales[u].totalEfectivo += venta.montoEfectivo
                                totalesAgrupados[i].totalEfectivo += venta.montoEfectivo
                            }
                            if(venta.montoTarjeta >0 ){
                                totalesAgrupados[i].sucursales[u].vendedores[index].totalTarjeta += venta.montoTarjeta
                                totalesAgrupados[i].sucursales[u].totalTarjeta += venta.montoTarjeta
                                totalesAgrupados[i].totalTarjeta += venta.montoTarjeta
                            }
                            if(venta.montoEfectivo > 0 && venta.montoTarjeta > 0 ){                                                                
                                totalesAgrupados[i].sucursales[u].vendedores[index].cantVtasPagoMixto += 1
                                totalesAgrupados[i].sucursales[u].cantVtasPagoMixto += 1
                                totalesAgrupados[i].cantVtasPagoMixto += 1
                            } else if(venta.montoEfectivo > 0 && venta.montoTarjeta == 0){
                                totalesAgrupados[i].sucursales[u].vendedores[index].cantVentasEfectivo += 1
                                totalesAgrupados[i].sucursales[u].cantVentasEfectivo += 1
                                totalesAgrupados[i].cantVentasEfectivo += 1
                            } else if(venta.montoEfectivo == 0 && venta.montoTarjeta > 0){
                                totalesAgrupados[i].sucursales[u].vendedores[index].cantVentasTerjeta += 1
                                totalesAgrupados[i].sucursales[u].cantVentasTerjeta += 1
                                totalesAgrupados[i].cantVentasTerjeta += 1
                            }
                            return true
                        }
                    })

                }
                
                

            }
            
        }
    }
 
    console.log(userFound)
    console.log("------------")
    console.log(totalesAgrupados)
      

    
   // if(!ventasFound){ console.log("MENSAJE(45646): No existen ventas registradas para la sucursal " + branchId); return false } 
    
    res.status(200).json(totalesAgrupados);
};