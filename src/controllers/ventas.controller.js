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

export const postAnularVenta = async (req, res) => {
    console.log("MENSAJE: Iniciando proceso de anulacion de venta")
   
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir
    if (!String(dbuserid).match(/^[0-9a-fA-F]{24}$/)){
        console.log("ERROR: postAnularVenta() - dbuserid formato inválido. Imposible anular venta!")
        return res.status(400).json("ERROR: postAnularVenta() - dbuserid formato inválido. Imposible anular venta!");
    } 
    if(!dbuserid){
        console.log("ERROR: postAnularVenta() - No dbuserid. dbuserid Expected - Imposible anular venta!")    
        return res.status(400).json("ERROR: postAnularVenta() - No dbuserid. dbuserid Expected - Imposible anular venta!");
    } 

    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
    }

    const userId = req.userId
    if (!String(userId).match(/^[0-9a-fA-F]{24}$/)){
        console.log("ERROR: postAnularVenta() - userId formato inválido. Imposible anular venta!")
        return res.status(400).json("ERROR: ajustarStock() - userId formato inválido. Imposible anular venta!");
    } 
    if(!userId){
        console.log("ERROR: postAnularVenta() - No userId. userId Expected - Imposible anular venta!")    
        return res.status(400).json("ERROR: postAnularVenta() - No userId. userId Expected - Imposible anular venta!")
    } 

    const userFound = await config.globalConnectionStack[dbuserid].user.findById(userId)
    if(!userFound) {
        console.log("ERROR: postAnularVenta() - No userId: "+userId+" not found. - Imposible anular venta!")    
        return res.status(400).json("ERROR: postAnularVenta() - No userId: "+userId+" not found. - Imposible anular venta!")    
    }

    var params = req.body;
    const ventaId = req.body.ventaId
    if(!ventaId){
        console.log("ERROR: postAnularVenta() - No ventaId. ventaId Expected - Imposible anular venta!")
        return res.status(400).json("ERROR: postAnularVenta() - No ventaId. ventaId Expected - Imposible anular venta!")
    }
    const ventaFound = await config.globalConnectionStack[dbuserid].venta.findById(ventaId)
    if(!ventaFound){
        console.log("ERROR: postAnularVenta() - ventaId: "+ventaId+" not found. - Imposible anular venta!")    
        return res.status(400).json("ERROR: postAnularVenta() - ventaId: "+ventaId+" not found. - Imposible anular venta!")    
    }

    const branchId =  req.body.branchId
    if(!branchId){
        console.log("ERROR: postAnularVenta() - No branchId. branchId Expected - Imposible anular venta!")
        return res.status(400).json("ERROR: postAnularVenta() - No branchId. branchId Expected - Imposible anular venta!")
    }
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchId)
    if(!branchFound){
        console.log("ERROR: postAnularVenta() - branchId: "+branchId+" not found. - Imposible anular venta!")    
        return res.status(400).json("ERROR: postAnularVenta() - branchId: "+branchId+" not found. - Imposible anular venta!")    
    }

    let fechaActual =  new Date().toISOString().slice(0, 19).replace('T', ' ')

    console.log(fechaActual)

    //actualizo el stock del productos asociados a la ventaId
    for(let v=0; v<ventaFound.productosVendidos.length; v++){    
        for(let p=0; p<branchFound.stock.length; p++){
            if(String(ventaFound.productosVendidos[v].productId) == String(branchFound.stock[p].product)){
                branchFound.stock[p].cantidad += ventaFound.productosVendidos[v].cantidad
                break
            }
        }
    }
    
    try {
        console.log("MENSAJE: Actualizando registro de stock de productos asociados a ventaId: " + ventaId +" - branchId: " +branchFound._id +" - dbuserid: " + dbuserid )
        const branchUpdated = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
            branchFound._id,
            branchFound,
            {
                new: true,
            }
        )
       if(branchUpdated){
        console.log("MENSAJE: Stock de producto asociados a ventaId: " + ventaId + " actualizado exitosamente!! - branchId: " +branchFound._id +" - dbuserid: " + dbuserid )
       }
    } catch (error) {
        console.log(error)
        console.log("ERROR: Ha ocurrido al intentar actualizar registro branchFound. " + branchFound._id + " - dbuserid: " + dbuserid )
        return res.status(500).json("ERROR: Ha ocurrido al intentar actualizar registro branchFound. " + branchFound._id + " - dbuserid: " + dbuserid )
    }

    //actualizo el estado de la ventaId
    ventaFound.anulada.anulada=true
    ventaFound.anulada.anuladaPor=userFound.username
    ventaFound.anulada.anuladaFecha=fechaActual

    try {
        console.log("MENSAJE: Actualizando estado de ventaId: " + ventaId +" - branchId: " +branchFound._id +" - dbuserid: " + dbuserid )
        const ventaUpdated = await config.globalConnectionStack[dbuserid].venta.findByIdAndUpdate(
            ventaId,
            ventaFound,
            {
                new: true,
            }
        )
       if(ventaUpdated){
        console.log("MENSAJE: Estado de ventaId: " + ventaId + " actualizado exitosamente!! - branchId: " +branchFound._id +" - dbuserid: " + dbuserid )
       }
    } catch (error) {
        console.log(error)
        console.log("ERROR: Ha ocurrido al intentar actualizar el estado de la ventaId: " + ventaId + " - dbuserid: " + dbuserid )
        return res.status(500).json("ERROR: Ha ocurrido al intentar actualizar el estado de la ventaId: " + ventaId + " - dbuserid: " + dbuserid )
    }


    return res.status(200).json(fechaActual);

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
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
    
    console.log(req.query.param)
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
            console.log(userFound.tiendas[i].branches[u].branchName)
            for (let j = 0; j < userFound.tiendas[i].branches[u].ventas.length; j++) {
                console.log(userFound.tiendas[i].branches[u].ventas[j].anulada.anulada)
                if(userFound.tiendas[i].branches[u].ventas[j].anulada.anulada == false)
                {                    
                    console.log("procesoooooooo")
                    console.log(userFound.tiendas[i].branches[u].ventas[j].totalVta)
                    let anio=userFound.tiendas[i].branches[u].ventas[j].fechaDeVta.getFullYear()
                    if(String(anio) == String(req.query.param)){                        
                        //VOY A REVISAR SI YA PROCESÉ LAS VENTAS PARA EL USUARIO de esta venta
                        
                        let ventasProcesadas = false
                        for (let iV = 0; iV < totalesAgrupados[i].sucursales[u].vendedores.length; iV++) {
                            if(totalesAgrupados[i].sucursales[u].vendedores[iV].userId == userFound.tiendas[i].branches[u].ventas[j].userId._id ){
                                ventasProcesadas = true                        
                                break
                            }
                        }
                        

                        if(ventasProcesadas==false){
                            
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
        }
    }
 
   // if(!ventasFound){ console.log("MENSAJE(45646): No existen ventas registradas para la sucursal " + branchId); return false } 
    
    res.status(200).json(totalesAgrupados);
};

export const getVentasForStatisticsPorSucursal = async (req, res) => {
    console.log("MENSAJE: Obteniendo ventas for statistics por sucursal...")
    //voy a obtener los totales de ventas por tienda y por sucursal
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
    
    console.log(req.query.branchId)
    console.log(req.query.yearVentas)
    console.log(req.query)

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
    // recorro las tiendas que tiene asignada el user
    // necesito encontrar la sucursal que me esta haciendo el pedido y procesas sus ventas

    //Voy a sacar:
    //LAS VENTAS DE CADA MES
    //LAS VENTAS TOTALES DE CADA VENDEDOR
    //LAS VENTAS DE CADA MES DE CADA VENDEDOR
    //PRODUCTO MAS VENDIDO DEL AÑO
    //PRODUCTO MAS VENDIDO DEL MES
    //CANTIDAD DE TRANSACCIONES
    //CANTIDAD DE TRANSACCIONES DE CADA MES
    //CANTIDAD DE TRANSACCIONES DE CADA VENDEDOR POR AÑO
    //CANTIDAD DE TRANSACCIONES DE CADA VENDEDOR POR MES
/*
    {
        branchName:        
        totalVentas:
        totVtas01:
        totVtas02:
        totVtas03:
        totVtas04:
        totVtas05:
        totVtas06:
        totVtas07:
        totVtas08:
        totVtas09:
        totVtas10:
        totVtas11:
        totVtas12:
        totalVentasFt:
        totVtasFt01:
        totVtasFt02:
        totVtasFt03:
        totVtasFt04:
        totVtasFt05:
        totVtasFt06:
        totVtasFt07:
        totVtasFt08:
        totVtasFt09:
        totVtasFt10:
        totVtasFt11:
        totVtasFt12:
        totalVentasTj:
        totVtasTj01:
        totVtasTj02:
        totVtasTj03:
        totVtasTj04:
        totVtasTj05:
        totVtasTj06:
        totVtasTj07:
        totVtasTj08:
        totVtasTj09:
        totVtasTj10:
        totVtasTj11:
        totVtasTj12:
        totalTransacc:
        totTrasac01:
        totTrasac02:
        totTrasac03:
        totTrasac04:
        totTrasac05:
        totTrasac06:
        totTrasac07:
        totTrasac08:
        totTrasac09:
        totTrasac10:
        totTrasac11:
        totTrasac12:
        totalTransaccFT:
        totTrasacFT01:
        totTrasacFT02:
        totTrasacFT03:
        totTrasacFT04:
        totTrasacFT05:
        totTrasacFT06:
        totTrasacFT07:
        totTrasacFT08:
        totTrasacFT09:
        totTrasacFT10:
        totTrasacFT11:
        totTrasacFT12:
        totalTransaccTJ:
        totTrasacTJ01:
        totTrasacTJ02:
        totTrasacTJ03:
        totTrasacTJ04:
        totTrasacTJ05:
        totTrasacTJ06:
        totTrasacTJ07:
        totTrasacTJ08:
        totTrasacTJ09:
        totTrasacTJ10:
        totTrasacTJ11:
        totTrasacTJ12:


                vendedores:[
                    {
                        username:
                        roleName:
                        totalVentas:
                    }
                ]
                productos:[
                    productId:
                    nombre:
                    codigo:
                    totalVendidos:
                    totalVdos01:
                    totalVdos02:
                    totalVdos03:
                    totalVdos04:
                    totalVdos05:
                    totalVdos06:
                    totalVdos07:
                    totalVdos08:
                    totalVdos09:
                    totalVdos10:
                    totalVdos11:
                    totalVdos12:
                ]
            }
        ]
    }

    {
        productId:
        detalle:{
            totalVendidos:
            totalVendidos01:
            totalVendidos02:
            totalVendidos03:
            totalVendidos04:
            totalVendidos05:
            totalVendidos06:
            totalVendidos07:
            totalVendidos08:
            totalVendidos09:
            totalVendidos10:
            totalVendidos11:
            totalVendidos12:
        }

    }
            productId:
            nombre:
            codigo:
            cantidad:
            precio:
            total:
        ]
*/

   // var totalesAgrupados = []
    for (let t = 0; t < userFound.tiendas.length; t++) {
        for (let b = 0; b < userFound.tiendas[t].branches.length; b++) {
            if(userFound.tiendas[t].branches[b]._id == req.query.branchId){
                var totalesAgrupados={
                    branchName:userFound.tiendas[t].branches[b].branchName,
                    totalVentas:0,
                    totVtas01:0,
                    totVtas02:0,
                    totVtas03:0,
                    totVtas04:0,
                    totVtas05:0,
                    totVtas06:0,
                    totVtas07:0,
                    totVtas08:0,
                    totVtas09:0,
                    totVtas10:0,
                    totVtas11:0,
                    totVtas12:0,
                    totalVentasFt:0,
                    totVtasFt01:0,
                    totVtasFt02:0,
                    totVtasFt03:0,
                    totVtasFt04:0,
                    totVtasFt05:0,
                    totVtasFt06:0,
                    totVtasFt07:0,
                    totVtasFt08:0,
                    totVtasFt09:0,
                    totVtasFt10:0,
                    totVtasFt11:0,
                    totVtasFt12:0,
                    totalVentasTj:0,
                    totVtasTj01:0,
                    totVtasTj02:0,
                    totVtasTj03:0,
                    totVtasTj04:0,
                    totVtasTj05:0,
                    totVtasTj06:0,
                    totVtasTj07:0,
                    totVtasTj08:0,
                    totVtasTj09:0,
                    totVtasTj10:0,
                    totVtasTj11:0,
                    totVtasTj12:0,
                    totalTransacc:0,
                    totTrasac01:0,
                    totTrasac02:0,
                    totTrasac03:0,
                    totTrasac04:0,
                    totTrasac05:0,
                    totTrasac06:0,
                    totTrasac07:0,
                    totTrasac08:0,
                    totTrasac09:0,
                    totTrasac10:0,
                    totTrasac11:0,
                    totTrasac12:0,
                    totalTransaccFT:0,
                    totTrasacFT01:0,
                    totTrasacFT02:0,
                    totTrasacFT03:0,
                    totTrasacFT04:0,
                    totTrasacFT05:0,
                    totTrasacFT06:0,
                    totTrasacFT07:0,
                    totTrasacFT08:0,
                    totTrasacFT09:0,
                    totTrasacFT10:0,
                    totTrasacFT11:0,
                    totTrasacFT12:0,
                    totalTransaccTJ:0,
                    totTrasacTJ01:0,
                    totTrasacTJ02:0,
                    totTrasacTJ03:0,
                    totTrasacTJ04:0,
                    totTrasacTJ05:0,
                    totTrasacTJ06:0,
                    totTrasacTJ07:0,
                    totTrasacTJ08:0,
                    totTrasacTJ09:0,
                    totTrasacTJ10:0,
                    totTrasacTJ11:0,
                    totTrasacTJ12:0,
                    productos:[
                        /*{
                        productId:"",
                        nombre:"",
                        codigo:"",
                        totalVendido:0,
                        totalVdo01:0,
                        totalVdo02:0,
                        totalVdo03:0,
                        totalVdo04:0,
                        totalVdo05:0,
                        totalVdo06:0,
                        totalVdo07:0,
                        totalVdo08:0,
                        totalVdo09:0,
                        totalVdo10:0,
                        totalVdo11:0,
                        totalVdo12:0
                    }
                    */],
                    vendedores:[
                        /*
                        {
                            username:"",
                            roleName:"",
                            totalVentas:0,
                            totVtas01:0,
                            totVtas02:0,
                            totVtas03:0,
                            totVtas04:0,
                            totVtas05:0,
                            totVtas06:0,
                            totVtas07:0,
                            totVtas08:0,
                            totVtas09:0,
                            totVtas10:0,
                            totVtas11:0,
                            totVtas12:0,
                            totalTransacc:0,
                            totTrasac01:0,
                            totTrasac02:0,
                            totTrasac03:0,
                            totTrasac04:0,
                            totTrasac05:0,
                            totTrasac06:0,
                            totTrasac07:0,
                            totTrasac08:0,
                            totTrasac09:0,
                            totTrasac10:0,
                            totTrasac11:0,
                            totTrasac12:0,
                        }
                        */
                    ],
                    
                }
              //  totalesAgrupados.push(objTienda)
                for (let v = 0; v < userFound.tiendas[t].branches[b].ventas.length; v++) {
                    if(userFound.tiendas[t].branches[b].ventas[v].anulada.anulada == false){
                        let anio=userFound.tiendas[t].branches[b].ventas[v].fechaDeVta.getFullYear() 
                        let mes = userFound.tiendas[t].branches[b].ventas[v].fechaDeVta.getMonth() + 1;
                        if(String(anio) == String(req.query.yearVentas)){
                            //TOTAL VENTAS/TRANSAC GENERAL
                            totalesAgrupados.totalVentas += userFound.tiendas[t].branches[b].ventas[v].totalVta
                            totalesAgrupados.totalTransacc += 1
                            //TOTAL VENTAS/TRANSAC GENERAL por forma de pago
                            if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo > 0){
                                totalesAgrupados.totalVentasFt += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                totalesAgrupados.totalTransaccFT += 1 
                            }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta > 0){
                                totalesAgrupados.totalVentasTj += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                totalesAgrupados.totalTransaccTJ += 1 
                            }                        
                            switch (mes) {
                                case 1:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas01 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac01 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt01 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT01 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj01 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ01 += 1 
                                    }                                
                                    break;
                                case 2:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas02 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac02 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt02 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT02 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj02 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ02 += 1 
                                    }   
                                    break;                        
                                case 3:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas03 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac03 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt03 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT03 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj03 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ03 += 1 
                                    } 
                                    break;
                                case 4:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas04 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac04 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt04 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT04 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj04 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ04 += 1 
                                    } 
                                    break;
                                case 5:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas05 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac05 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt05 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT05 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj05 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ05 += 1 
                                    } 
                                    break;
                                case 6:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas06 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac06 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt06 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT06 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj06 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ06 += 1 
                                    } 
                                    break;
                                case 7:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas07 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac07 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt07 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT07 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj07 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ07 += 1 
                                    } 
                                    break;
                                case 8:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas08 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac08 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt08 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT08 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj08 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ08 += 1 
                                    } 
                                    break;                        
                                case 9:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas09 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac09 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt09 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT09 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj09 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ09 += 1 
                                    } 
                                    break;
                                case 10:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas10 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac10 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt10 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT10 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj10 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ10 += 1 
                                    } 
                                    break;
                                case 11:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas11 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac11 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt11 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT11 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj11 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ11 += 1 
                                    } 
                                    break;
                                case 12:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    totalesAgrupados.totVtas12 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totalesAgrupados.totTrasac12 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        totalesAgrupados.totVtasFt12 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        totalesAgrupados.totTrasacFT12 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        totalesAgrupados.totVtasTj12 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        totalesAgrupados.totTrasacTJ12 += 1 
                                    } 
                                    break;

                            }
                            // TOTALES cantidad prod vendidos por producto
                            for (let pv = 0; pv < userFound.tiendas[t].branches[b].ventas[v].productosVendidos.length; pv++) {
                                let prodProcesado = false
                                for (let p = 0; p < totalesAgrupados.productos.length; p++) {
                                    if(String(totalesAgrupados.productos[p].productId) == String(userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].productId)){
                                        totalesAgrupados.productos[p].totalVendido += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        switch (mes) {
                                            case 1:                                       
                                                totalesAgrupados.productos[p].totalVdo01 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$01 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 2:
                                                totalesAgrupados.productos[p].totalVdo02 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$02 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;                        
                                            case 3:
                                                totalesAgrupados.productos[p].totalVdo03 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$03 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 4:
                                                totalesAgrupados.productos[p].totalVdo04 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$04 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 5:
                                                totalesAgrupados.productos[p].totalVdo05 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$05 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 6:
                                                totalesAgrupados.productos[p].totalVdo06 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$06 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 7:
                                                totalesAgrupados.productos[p].totalVdo07 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$07 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 8:
                                                totalesAgrupados.productos[p].totalVdo08 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$08 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;                        
                                            case 9:
                                                totalesAgrupados.productos[p].totalVdo09 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$09 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 10:
                                                totalesAgrupados.productos[p].totalVdo10 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$10 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 11:
                                                totalesAgrupados.productos[p].totalVdo11 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$11 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
                                            case 12:
                                                totalesAgrupados.productos[p].totalVdo12 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                                totalesAgrupados.productos[p].totalVdo$12 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                                break;
        
                                        }
                                        prodProcesado = true
                                        break
                                    }
                                }
                                if(prodProcesado == false){
                                    var objProducto={
                                        productId: userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].productId,
                                        nombre: userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].nombre,
                                        codigo: userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].codigo,
                                        totalVendido: userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad,
                                        totalVendido$: userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total,
                                        totalVdo01:0,
                                        totalVdo02:0,
                                        totalVdo03:0,
                                        totalVdo04:0,
                                        totalVdo05:0,
                                        totalVdo06:0,
                                        totalVdo07:0,
                                        totalVdo08:0,
                                        totalVdo09:0,
                                        totalVdo10:0,
                                        totalVdo11:0,
                                        totalVdo12:0,
                                        totalVdo$01:0,
                                        totalVdo$02:0,
                                        totalVdo$03:0,
                                        totalVdo$04:0,
                                        totalVdo$05:0,
                                        totalVdo$06:0,
                                        totalVdo$07:0,
                                        totalVdo$08:0,
                                        totalVdo$09:0,
                                        totalVdo$10:0,
                                        totalVdo$11:0,
                                        totalVdo$12:0
                                    }
                                    switch (mes) {
                                        case 1:                                       
                                            objProducto.totalVdo01 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$01 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 2:
                                            objProducto.totalVdo02 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$02 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;                        
                                        case 3:
                                            objProducto.totalVdo03 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$03 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 4:
                                            objProducto.totalVdo04 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$04 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 5:
                                            objProducto.totalVdo05 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$05 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 6:
                                            objProducto.totalVdo06 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$06 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 7:
                                            objProducto.totalVdo07 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$07 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 8:
                                            objProducto.totalVdo08 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$08 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;                        
                                        case 9:
                                            objProducto.totalVdo09 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$09 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 10:
                                            objProducto.totalVdo10 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$10 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 11:
                                            objProducto.totalVdo11 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$11 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;
                                        case 12:
                                            objProducto.totalVdo12 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            objProducto.totalVdo$12 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].total
                                            break;

                                    }
                                    totalesAgrupados.productos.push(objProducto)
                                }
                            }
                            // TOTALES por vendedor
                            let vendedorProcesado = false
                            for (let ven = 0; ven < totalesAgrupados.vendedores.length; ven++) {                            
                                if(String(totalesAgrupados.vendedores[ven].userId) == String(userFound.tiendas[t].branches[b].ventas[v].userId._id)){
                                    totalesAgrupados.vendedores[ven].totalVentas += userFound.tiendas[t].branches[b].ventas[v].totalVta
                                    totalesAgrupados.vendedores[ven].totalTransacc += 1
                                    switch (mes) {
                                        case 1:
                                            totalesAgrupados.vendedores[ven].totVtas01 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac01 += 1
                                            break;
                                        case 2:
                                            totalesAgrupados.vendedores[ven].totVtas02 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac02 += 1
                                            break;                        
                                        case 3:
                                            totalesAgrupados.vendedores[ven].totVtas03 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac03 += 1
                                            break;
                                        case 4:
                                            totalesAgrupados.vendedores[ven].totVtas04 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac04 += 1
                                            break;
                                        case 5:
                                            totalesAgrupados.vendedores[ven].totVtas05 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac05 += 1
                                            break;
                                        case 6:
                                            totalesAgrupados.vendedores[ven].totVtas06 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac06 += 1
                                            break;
                                        case 7:
                                            totalesAgrupados.vendedores[ven].totVtas07 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac07 += 1
                                            break;
                                        case 8:
                                            totalesAgrupados.vendedores[ven].totVtas08 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac08 += 1
                                            break;                        
                                        case 9:
                                            totalesAgrupados.vendedores[ven].totVtas09 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac09 += 1
                                            break;
                                        case 10:
                                            totalesAgrupados.vendedores[ven].totVtas10 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac10 += 1
                                            break;
                                        case 11:
                                            totalesAgrupados.vendedores[ven].totVtas11 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac11 += 1
                                            break;
                                        case 12:
                                            totalesAgrupados.vendedores[ven].totVtas12 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                            totalesAgrupados.vendedores[ven].totTrasac12 += 1
                                            break;
        
                                    }
                                    vendedorProcesado = true
                                    break
                                }
                            }
                            if(vendedorProcesado == false){
                                var objVendedor={
                                    userId: userFound.tiendas[t].branches[b].ventas[v].userId._id,
                                    username: userFound.tiendas[t].branches[b].ventas[v].userId.username,
                                    roleName: userFound.tiendas[t].branches[b].ventas[v].userId.roles[0].roleName,
                                    totalVentas: userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    totVtas01:0,
                                    totVtas02:0,
                                    totVtas03:0,
                                    totVtas04:0,
                                    totVtas05:0,
                                    totVtas06:0,
                                    totVtas07:0,
                                    totVtas08:0,
                                    totVtas09:0,
                                    totVtas10:0,
                                    totVtas11:0,
                                    totVtas12:0,
                                    totalTransacc: 1,
                                    totTrasac01:0,
                                    totTrasac02:0,
                                    totTrasac03:0,
                                    totTrasac04:0,
                                    totTrasac05:0,
                                    totTrasac06:0,
                                    totTrasac07:0,
                                    totTrasac08:0,
                                    totTrasac09:0,
                                    totTrasac10:0,
                                    totTrasac11:0,
                                    totTrasac12:0,
                                }
                                switch (mes) {
                                    case 1:
                                        objVendedor.totVtas01 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac01 = 1
                                        break;
                                    case 2:
                                        objVendedor.totVtas02 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac02 = 1
                                        break;                        
                                    case 3:
                                        objVendedor.totVtas03 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac03 = 1
                                        break;
                                    case 4:
                                        objVendedor.totVtas04 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac04 = 1
                                        break;
                                    case 5:
                                        objVendedor.totVtas05 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac05 = 1
                                        break;
                                    case 6:
                                        objVendedor.totVtas06 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac06 = 1
                                        break;
                                    case 7:
                                        objVendedor.totVtas07 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac07 = 1
                                        break;
                                    case 8:
                                        objVendedor.totVtas08 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac08 = 1
                                        break;                        
                                    case 9:
                                        objVendedor.totVtas09 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac09 = 1
                                        break;
                                    case 10:
                                        objVendedor.totVtas10 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac10 = 1
                                        break;
                                    case 11:
                                        objVendedor.totVtas11 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac11 = 1
                                        break;
                                    case 12:
                                        objVendedor.totVtas12 = userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                        objVendedor.totTrasac12 = 1
                                        break;

                                }
                                totalesAgrupados.vendedores.push(objVendedor)
                            }

                        }
                    }
                }
                

            }

        }
    }
    res.status(200).json(totalesAgrupados);
}

export const getVentasForStatisticsPorTienda = async (req, res) => {
    console.log("MENSAJE: Obteniendo ventas for statistics por tienda...")
    //voy a obtener los totales de ventas por tienda y por sucursal
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
    
    console.log(req.query.storeId)
    console.log(req.query.yearVentas)
    console.log(req.query)

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
    // recorro las tiendas que tiene asignada el user
    /*
    {
        tienda:[
            tiendaName:
            totalVentas:
            totalVentas01:
            totalVentas02:
            totalVentas03:
            totalVentas04:
            totalVentas05:
            totalVentas06:
            totalVentas07:
            totalVentas08:
            totalVentas09:
            totalVentas10:
            totalVentas11:
            totalVentas12:

            totalVentasFT:
            totalVentasFT01:
            totalVentasFT02:
            totalVentasFT03:
            totalVentasFT04:
            totalVentasFT05:
            totalVentasFT06:
            totalVentasFT07:
            totalVentasFT08:
            totalVentasFT09:
            totalVentasFT10:
            totalVentasFT11:
            totalVentasFT12:

            totalVentasTC:
            totalVentasTC01:
            totalVentasTC02:
            totalVentasTC03:
            totalVentasTC04:
            totalVentasTC05:
            totalVentasTC06:
            totalVentasTC07:
            totalVentasTC08:
            totalVentasTC09:
            totalVentasTC10:
            totalVentasTC11:
            totalVentasTC12:

            totalTransac:
            totalTransac01:
            totalTransac02:
            totalTransac03:
            totalTransac04:
            totalTransac05:
            totalTransac06:
            totalTransac07:
            totalTransac08:
            totalTransac09:
            totalTransac10:
            totalTransac11:
            totalTransac12:

            totalTransacFT:
            totalTransacFT01:
            totalTransacFT02:
            totalTransacFT03:
            totalTransacFT04:
            totalTransacFT05:
            totalTransacFT06:
            totalTransacFT07:
            totalTransacFT08:
            totalTransacFT09:
            totalTransacFT10:
            totalTransacFT11:
            totalTransacFT12:

            totalTransaTCc:
            totalTransacTC01:
            totalTransacTC02:
            totalTransacTC03:
            totalTransacTC04:
            totalTransacTC05:
            totalTransacTC06:
            totalTransacTC07:
            totalTransacTC08:
            totalTransacTC09:
            totalTransacTC10:
            totalTransacTC11:
            totalTransacTC12:

            

        ]
    }
    */
    var totalesAgrupados=[]
    for (let t = 0; t < userFound.tiendas.length; t++) {
        if (String(userFound.tiendas[t].store._id) == String(req.query.storeId)){
            for (let b = 0; b < userFound.tiendas[t].branches.length; b++) {

                let objTotalesAgrupados = {
                    branchName : userFound.tiendas[t].branches[b].branchName,
                    totalVentas : 0,
                    totalVentas01 : 0,
                    totalVentas02 : 0,
                    totalVentas03 : 0,
                    totalVentas04 : 0,
                    totalVentas05 : 0,
                    totalVentas06 : 0,
                    totalVentas07 : 0,
                    totalVentas08 : 0,
                    totalVentas09 : 0,
                    totalVentas10 : 0,
                    totalVentas11 : 0,
                    totalVentas12 : 0,
        
                    totalVentasFT : 0,
                    totalVentasFT01 : 0,
                    totalVentasFT02 : 0,
                    totalVentasFT03 : 0,
                    totalVentasFT04 : 0,
                    totalVentasFT05 : 0,
                    totalVentasFT06 : 0,
                    totalVentasFT07 : 0,
                    totalVentasFT08 : 0,
                    totalVentasFT09 : 0,
                    totalVentasFT10 : 0,
                    totalVentasFT11 : 0,
                    totalVentasFT12 : 0,
        
                    totalVentasTC : 0,
                    totalVentasTC01 : 0,
                    totalVentasTC02 : 0,
                    totalVentasTC03 : 0,
                    totalVentasTC04 : 0,
                    totalVentasTC05 : 0,
                    totalVentasTC06 : 0,
                    totalVentasTC07 : 0,
                    totalVentasTC08 : 0,
                    totalVentasTC09 : 0,
                    totalVentasTC10 : 0,
                    totalVentasTC11 : 0,
                    totalVentasTC12 : 0,
        
                    totalTransac : 0,
                    totalTransac01 : 0,
                    totalTransac02 : 0,
                    totalTransac03 : 0,
                    totalTransac04 : 0,
                    totalTransac05 : 0,
                    totalTransac06 : 0,
                    totalTransac07 : 0,
                    totalTransac08 : 0,
                    totalTransac09 : 0,
                    totalTransac10 : 0,
                    totalTransac11 : 0,
                    totalTransac12 : 0,
        
                    totalTransacFT : 0,
                    totalTransacFT01 : 0,
                    totalTransacFT02 : 0,
                    totalTransacFT03 : 0,
                    totalTransacFT04 : 0,
                    totalTransacFT05 : 0,
                    totalTransacFT06 : 0,
                    totalTransacFT07 : 0,
                    totalTransacFT08 : 0,
                    totalTransacFT09 : 0,
                    totalTransacFT10 : 0,
                    totalTransacFT11 : 0,
                    totalTransacFT12 : 0,
        
                    totalTransacTC : 0,
                    totalTransacTC01 : 0,
                    totalTransacTC02 : 0,
                    totalTransacTC03 : 0,
                    totalTransacTC04 : 0,
                    totalTransacTC05 : 0,
                    totalTransacTC06 : 0,
                    totalTransacTC07 : 0,
                    totalTransacTC08 : 0,
                    totalTransacTC09 : 0,
                    totalTransacTC10 : 0,
                    totalTransacTC11 : 0,
                    totalTransacTC12 : 0,
                }
                //console.log(userFound.tiendas[t].branches[b].ventas)
                for (let v = 0; v < userFound.tiendas[t].branches[b].ventas.length; v++){ 
                             
                    if(userFound.tiendas[t].branches[b].ventas[v].anulada.anulada == false){
                        let anio=userFound.tiendas[t].branches[b].ventas[v].fechaDeVta.getFullYear() 
                        let mes = userFound.tiendas[t].branches[b].ventas[v].fechaDeVta.getMonth() + 1;
                        if(String(anio) == String(req.query.yearVentas)){
                            objTotalesAgrupados.totalVentas += userFound.tiendas[t].branches[b].ventas[v].totalVta
                            objTotalesAgrupados.totalTransac += 1
                            if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo > 0){
                                objTotalesAgrupados.totalVentasFT += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                objTotalesAgrupados.totalTransacFT += 1 
                            }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta > 0){
                                objTotalesAgrupados.totalVentasTC += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                objTotalesAgrupados.totalTransacTC += 1 
                            }                        
                            switch (mes) {
                                case 1:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas01 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac01 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT01 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT01 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC01 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC01 += 1 
                                    }                                
                                    break;
                                case 2:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas02 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac02 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT02 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT02 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC02 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC02 += 1 
                                    }                                
                                    break;
                                case 3:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas03 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac03 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT03 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT03 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC03 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC03 += 1 
                                    }                                
                                    break;
                                case 4:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas04 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac04 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT04 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT04 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC04 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC04 += 1 
                                    }                                
                                    break;
                                case 5:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas05 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac05 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT05 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT05 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC05 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC05 += 1 
                                    }                                
                                    break;
                                case 6:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas06 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac06 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT06 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT06 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC06 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC06 += 1 
                                    }                                
                                    break;
                                case 7:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas07 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac07 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT07 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT07 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC07 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC07 += 1 
                                    }                                
                                    break;
                                case 8:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas08 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac08 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT08 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT08 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC08 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC08 += 1 
                                    }                                
                                    break;
                                case 9:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas09 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac09 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT09 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT09 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC09 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC09 += 1 
                                    }                                
                                    break;
                                case 10:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas10 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac10 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT10 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT10 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC10 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC10 += 1 
                                    }                                
                                    break;
                                case 11:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas11 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac11 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT11 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT11 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC11 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC11 += 1 
                                    }                                
                                    break;
                                case 12:
                                    //TOTAL VENTAS/TRANSAC gral del mes
                                    objTotalesAgrupados.totalVentas12 += userFound.tiendas[t].branches[b].ventas[v].totalVta,
                                    objTotalesAgrupados.totalTransac12 += 1
                                    //TOTAL VENTAS/TRANSAC del mes por forma de pago
                                    if(userFound.tiendas[t].branches[b].ventas[v].montoEfectivo>0){
                                        objTotalesAgrupados.totalVentasFT12 += userFound.tiendas[t].branches[b].ventas[v].montoEfectivo
                                        objTotalesAgrupados.totalTransacFT12 += 1 
                                    }else if(userFound.tiendas[t].branches[b].ventas[v].montoTarjeta>0){
                                        objTotalesAgrupados.totalVentasTC12 += userFound.tiendas[t].branches[b].ventas[v].montoTarjeta
                                        objTotalesAgrupados.totalTransacTC12 += 1 
                                    }                                
                                    break;
                            }
                        }

                    }
                }

                objTotalesAgrupados.totalVentasFT = objTotalesAgrupados.totalVentasFT01 + objTotalesAgrupados.totalVentasFT02 + objTotalesAgrupados.totalVentasFT03 + objTotalesAgrupados.totalVentasFT04 + objTotalesAgrupados.totalVentasFT05 + objTotalesAgrupados.totalVentasFT06 + objTotalesAgrupados.totalVentasFT07 + objTotalesAgrupados.totalVentasFT08 + objTotalesAgrupados.totalVentasFT09 + objTotalesAgrupados.totalVentasFT10 + objTotalesAgrupados.totalVentasFT11 + objTotalesAgrupados.totalVentasFT12;
                objTotalesAgrupados.totalVentasTC = objTotalesAgrupados.totalVentasTC01 + objTotalesAgrupados.totalVentasTC02 + objTotalesAgrupados.totalVentasTC03 + objTotalesAgrupados.totalVentasTC04 + objTotalesAgrupados.totalVentasTC05 + objTotalesAgrupados.totalVentasTC06 + objTotalesAgrupados.totalVentasTC07 + objTotalesAgrupados.totalVentasTC08 + objTotalesAgrupados.totalVentasTC09 + objTotalesAgrupados.totalVentasTC10 + objTotalesAgrupados.totalVentasTC11 + objTotalesAgrupados.totalVentasTC12;
                objTotalesAgrupados.totalTransacFT = objTotalesAgrupados.totalTransacFT01 + objTotalesAgrupados.totalTransacFT02 + objTotalesAgrupados.totalTransacFT03 + objTotalesAgrupados.totalTransacFT04 + objTotalesAgrupados.totalTransacFT05 + objTotalesAgrupados.totalTransacFT06 + objTotalesAgrupados.totalTransacFT07 + objTotalesAgrupados.totalTransacFT08 + objTotalesAgrupados.totalTransacFT09 + objTotalesAgrupados.totalTransacFT10 + objTotalesAgrupados.totalTransacFT11 + objTotalesAgrupados.totalTransacFT12;
                objTotalesAgrupados.totalTransacTC = objTotalesAgrupados.totalTransacTC01 + objTotalesAgrupados.totalTransacTC02 + objTotalesAgrupados.totalTransacTC03 + objTotalesAgrupados.totalTransacTC04 + objTotalesAgrupados.totalTransacTC05 + objTotalesAgrupados.totalTransacTC06 + objTotalesAgrupados.totalTransacTC07 + objTotalesAgrupados.totalTransacTC08 + objTotalesAgrupados.totalTransacTC09 + objTotalesAgrupados.totalTransacTC10 + objTotalesAgrupados.totalTransacTC11 + objTotalesAgrupados.totalTransacTC12;       
                totalesAgrupados.push(objTotalesAgrupados)

            }
        }
    }
    res.status(200).json(totalesAgrupados);

}