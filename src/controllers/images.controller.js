import config from "../config";
import path from "path";
import fs from "fs-extra";

export const getImageCompras = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de compras ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageCategorias = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de categorias ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageEstadisticas = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de estadisticas ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageListaDePrecios = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de listadeprecios ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageNuevaSucursal = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de nuevasucursal ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageProductos = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de productos ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageStock = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de stock ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageSucursales = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de sucursales ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageUsuarios = async (req, res) => {
    console.log("getImageCompras() - buscando imagen de usuarios ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageVendedores = async (req, res) => {
    console.log("getImageVendedores() - buscando imagen de vendedores ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageVentas = async (req, res) => {
    console.log("getImageVentas() - buscando imagen de ventas ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageLoro2 = async (req, res) => {
    console.log("getImageLoro2() - buscando imagen de loro2 ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}
export const getImageProveedores = async (req, res) => {
    console.log("getImageProveedores() - buscando imagen de proveedores ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}

export const getImageTiendas = async (req, res) => {
    console.log("getImageTiendas() - buscando imagen de proveedores ")
    const dbuserid = req.userDB //dbuserid me dice en que db tengo que escribir

    const image = req.params.image
    const pathImage = path.resolve(__dirname,`../imagenes/${image}`)
    if(await fs.existsSync(pathImage)){
        res.sendFile(pathImage)
    }else {
        const pathNoImage = path.resolve(__dirname,`../imagenes/no-image.png`)
        res.sendFile(pathNoImage)
    }
}