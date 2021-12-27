import config from "../config";
import * as storeControler from "./stores.controller";

//Creamos una nueva tienda 
export const createBranch = async (req, res) => {
  const { storeid, branchName, address, dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir
  
  //verifico el formato del storeid
  if(!storeid) return res.status(401).json({ message: "storeid expected" });
  if(!storeid.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ message: "Invalid storeid: " + storeid });
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


export const getBranchById = async (req, res) => {
  const { branchId } = req.params;

  const branch = await Branch.findById(branchId);
  res.status(200).json(branch);
};

export const getBranches = async (req, res) => {
  const branches = await Branch.find();
  return res.json(branches);
};

export const updateBranchById = async (req, res) => {
  const updatedBranch = await Branch.findByIdAndUpdate(
    req.params.branchId,
    req.body,
    {
      new: true,
    }
  );
  res.status(204).json(updatedBranch);
};

export const deleteBranchById = async (req, res) => {
  const { branchId } = req.params;

  await Branch.findByIdAndDelete(branchId);

  // code 200 is ok too
  res.status(204).json();
};
