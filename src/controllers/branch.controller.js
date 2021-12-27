import config from "../config";
import * as storeControler from "./stores.controller";

//Creamos una nueva tienda 
export const createBranch = async (req, res) => {
  const { storeid, branchName, address, dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  
  //verifico el formato del storeid
  if(!storeid) return res.status(401).json({ message: "storeid expected" });
  if(!String(storeid).match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: "Invalid storeid: " + storeid });
  if(!address) return res.status(401).json({ message: "address expected" });
  if(!branchName) return res.status(401).json({ message: "branchName expected" });
  
  //verifico si me llega el dbuserid para saber cual es la DB con la que voy a trabajar
  if(!dbuserid) return res.status(401).json({ message: "dbuserid expected" });

  try {
    const newBranch = await new config.globalConnectionStack[dbuserid].branch({
      branchName,
      address
    });
    if(!newBranch) return res.status(401).json({ message: "Unable to create new branch for user " + dbuserid });
    const newSavedBranch = await newBranch.save();  //Guardo la store en la DB del usuario
    if(!newSavedBranch) return res.status(401).json({ message: "Unable to save new branch: " + newBranch.branchName + " for user id" + dbuserid });

    //actualizo la store para agregarle la nueva branch que acabo de crear
    await storeControler.addBranchToStore(storeid, newSavedBranch._id, dbuserid)
    res.status(201).json(newSavedBranch);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getBranches = async (req, res) => {
  const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  try {
    const branchesFound = await config.globalConnectionStack[dbuserid].branch.find();
    if(!branchesFound) return res.status(403).json({ message: "No branches found for " + dbuserid + " user"  });

    res.status(200).json(branchesFound);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getBranchById = async (req, res) => {
  const  branchid  = req.params.branchId;

  if (!branchid) return res.status(403).json({ message: "No branch id provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(branchid).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid branch ID: " + branchid });
  } 

  const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  try {
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchid);
    if(!branchFound) return res.status(403).json({ message: "Branch " + branchid + " not found" });

    res.status(200).json(branchFound);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const deleteBranchById = async (req, res) => {
  const  branchid  = req.params.branchId;
  if (!branchid) return res.status(403).json({ message: "No branch id provided" });
  
  //VERIFICO si tengo un formato valido de id
  if (!String(branchid).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid branch ID: " + branchid });
  } 

  const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });

  try {
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findByIdAndDelete(branchid);
    if(!branchFound) return res.status(403).json({ message: "Branch " + branchid + " not found" });

    //voy a eliminar esta branch del array de branches de la store dueña
    const storeid = await storeControler.findBranchStoreOwner(branchid,dbuserid)
    if(storeid){
      await storeControler.deleteBranchFromStore(storeid, branchid, dbuserid)
    }

    res.status(204).json({ message: "Branch: " + branchid + " successfully deleted" });

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const updateBranchById = async (req, res) => {
  const  branchid  = req.params.branchId;
  if (!branchid) return res.status(403).json({ message: "No branch ID provided" });

  //VERIFICO si tengo un formato valido de id
  if (!String(branchid).match(/^[0-9a-fA-F]{24}$/)){
    return res.status(400).json({ message: "Invalid branch ID: " + branchid });
  } 

  const { branchName, address, dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  if (!dbuserid) return res.status(403).json({ message: "No dbuserid provided" });
  if (!branchName) return res.status(403).json({ message: "No branchName name provided" });
  if (!address) return res.status(403).json({ message: "No address provided" });

  try {
    const branchFound = await config.globalConnectionStack[dbuserid].branch.findById(branchid);
    if(!branchFound) return res.status(403).json({ message: "branch " + branchid + " not found" });
    branchFound.branchName = branchName   //--> esto es lo que voy a actualizar
    branchFound.address = address   //--> esto es lo que voy a actualizar
    const updatedBranch = await config.globalConnectionStack[dbuserid].branch.findByIdAndUpdate(
      branchid,
      branchFound,
        {
          new: true,
        }
      );
     return res.status(204).json(updatedBranch);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};
