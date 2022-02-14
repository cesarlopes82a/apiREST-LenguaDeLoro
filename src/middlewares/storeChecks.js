import config from "../config";

const checkStoreExisted = async(req, res, next) => {
  const dbuserid = req.userDB
  try {
    const { storeName } = req.body;
    if (!storeName) return res.status(403).json({ message: "No store name provided" });
    if (!dbuserid) return res.status(409).json({ message: "No dbuserid name provided" });

    const storeFound = await config.globalConnectionStack[dbuserid].store.findOne({ storeName: storeName });

    if (storeFound) return res.status(400).json({ message: "The store already exists" });

    next();
    
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

const checkStoreIdExisted = async(req, res, next) => {
  const dbuserid = req.userDB
  try {
    const { storeId } = req.body;
    if (!storeId) return res.status(403).json({ message: "No storeId provided" });
    if (!dbuserid) return res.status(410).json({ message: "No dbuserid name provided" });

    const storeFound = await config.globalConnectionStack[dbuserid].store.findByid(storeid);

    if (storeFound) return res.status(400).json({ message: "The store already exists" });

    next();
    
  } catch (error) {
    res.status(500).json({ message: error });
  }
};


const checkBranchBelongsToStore = async(req, res, next) => {
  console.log("estoy en el checkBranchBelongsToStore")
  let meVoy = false
  const dbuserid = req.userDB
  const { storeId, branchId } = req.body

  //busco la tienda
  const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
  //traigo todas las branches
  const branches = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: storeFound.branches } }); 
  if(branches.length>0){
      for (let i = 0; i < branches.length; i++) {
          if (branches[i]._id == branchId) {
              next();
              return;
          }
      }
  }
  return res.status(401).json({ message: "Branch " + branchId + " does not belongs to store " + storeId });     
};
  export { checkStoreExisted, checkStoreIdExisted, checkBranchBelongsToStore };