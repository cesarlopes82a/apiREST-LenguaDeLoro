import Store from "../models/Store";
import appfile from "../app"
import Branch from "../models/Branch";
import mongoose from "mongoose";
import config from "../config";
import userconnection from "../libs/globalConnectionStack";


//Creamos una nueva tienda --> esto funciona
export const createStore = async (req, res) => {

  const { storeName, dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  try {
    userconnection.createUserConnectionStack(dbuserid);
    
    const newStore = new config.globalConnectionStack[dbuserid].store({
      //save user model to the corresponding stack
      storeName,
      branches: [],
    });

    const storeSaved = await newStore.save();

    res.status(201).json(storeSaved);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};









//Buscamos una tienda por ID
export const getStoreById = async (req, res) => {
  const { storeId } = req.params;

  const store = await Store.findById(storeId);
  res.status(200).json(store);
};

//Buscamos todas las tiendas
export const getStores = async (req, res) => {
  const stores = await Store.find();
  return res.json(stores);
};

//Modificamos una tienda por ID
export const updateStoreById = async (req, res) => {
  const updatedStore = await Store.findByIdAndUpdate(
    req.params.storeId,
    req.body,
    {
      new: true,
    }
  );
  res.status(204).json(updatedStore);
};

//Eliminamos una tienda por ID
export const deleteStoreById = async (req, res) => {
  const { storeId } = req.params;

  await Store.findByIdAndDelete(storeId);

  // code 200 is ok too
  res.status(204).json();
};
