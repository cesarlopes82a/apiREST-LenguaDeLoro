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
            for (let j = 0; j < userFound.tiendas[i].branches[u].ventas.length; j++) {
                let anio=userFound.tiendas[i].branches[u].ventas[j].fechaDeVta.getFullYear()
                console.log(anio);
                if(String(anio) == String(req.query.param)){
                    console.log(anio +" - " + req.query.param)
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
 
      

    
   // if(!ventasFound){ console.log("MENSAJE(45646): No existen ventas registradas para la sucursal " + branchId); return false } 
    
    res.status(200).json(totalesAgrupados);
};

export const getVentasForStatisticsPorSucursal = async (req, res) => {
    console.log("MENSAJE: Obteniendo ventas for statistics...")
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
                                            break;
                                        case 2:
                                            totalesAgrupados.productos[p].totalVdo02 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;                        
                                        case 3:
                                            totalesAgrupados.productos[p].totalVdo03 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 4:
                                            totalesAgrupados.productos[p].totalVdo04 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 5:
                                            totalesAgrupados.productos[p].totalVdo05 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 6:
                                            totalesAgrupados.productos[p].totalVdo06 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 7:
                                            totalesAgrupados.productos[p].totalVdo07 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 8:
                                            totalesAgrupados.productos[p].totalVdo08 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;                        
                                        case 9:
                                            totalesAgrupados.productos[p].totalVdo09 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 10:
                                            totalesAgrupados.productos[p].totalVdo10 += userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 11:
                                            totalesAgrupados.productos[p].totalVdo11 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                            break;
                                        case 12:
                                            totalesAgrupados.productos[p].totalVdo12 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
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
                                switch (mes) {
                                    case 1:                                       
                                        objProducto.totalVdo01 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 2:
                                        objProducto.totalVdo02 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;                        
                                    case 3:
                                        objProducto.totalVdo03 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 4:
                                        objProducto.totalVdo04 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 5:
                                        objProducto.totalVdo05 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 6:
                                        objProducto.totalVdo06 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 7:
                                        objProducto.totalVdo07 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 8:
                                        objProducto.totalVdo08 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;                        
                                    case 9:
                                        objProducto.totalVdo09 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 10:
                                        objProducto.totalVdo10 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 11:
                                        objProducto.totalVdo11 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
                                        break;
                                    case 12:
                                        objProducto.totalVdo12 = userFound.tiendas[t].branches[b].ventas[v].productosVendidos[pv].cantidad
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
    res.status(200).json(totalesAgrupados);
}