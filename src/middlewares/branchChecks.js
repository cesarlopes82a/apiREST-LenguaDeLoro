import config from "../config";
import * as userconnection from "../libs/globalConnectionStack";

const checkBranchExisted = async(req, res, next) => {
    const dbuserid = req.userDB
    try {
        const { branchName } = req.body;
        if (!branchName) return res.status(403).json({ message: "No branch name provided" });
        if (!dbuserid) return res.status(403).json({ message: "No dbuserid name provided" });

        const branchFound = await config.globalConnectionStack[dbuserid].branch.findOne({ branchName: branchName });

        if (branchFound) return res.status(400).json({ message: "The branch already exists" });

        next();
        
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

const checkBranchIdExisted = async(req, res, next) => {
    const dbuserid = req.userDB
    try {
        const { branchid } = req.body;
        if (!branchid) return res.status(403).json({ message: "No branchid provided" });
        if (!dbuserid) return res.status(403).json({ message: "No dbuserid name provided" });

        const branchFound = await config.globalConnectionStack[dbuserid].branch.findByid(branchid);

        if (branchFound) return res.status(400).json({ message: "The branchid already exists" });

        next();
        
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

//Uso este check cuando voy a crear una branch nueva o cuando se la quiero atachar a un usuario
const checkBranchNameExistsInStore = async(req, res, next) => {
    console.log("voy a hacer el checkBranchNameExistsInStore")
    const dbuserid = req.userDB
    const { branchName, storeId } = req.body;

    if (!branchName) return res.status(403).json({ message: "No branchName name provided" });
    if (!storeId) return res.status(403).json({ message: "No storeId name provided" });
    if (!dbuserid) return res.status(403).json({ message: "dbuserid required" });

    try {
        //me fijo si existe la tienda
        await userconnection.checkandcreateUserConnectionStack(dbuserid);
        console.log(storeId)
        const storeFound = await config.globalConnectionStack[dbuserid].store.findById(storeId);
        if(!storeFound) return res.status(403).json({ message: "no storeFound" });
        console.log("me voy")
        // me traigo toda la lista de branches que tiene agregada la tienda y la guardo dentro del "array branches"
        const branches = await config.globalConnectionStack[dbuserid].branch.find({ _id: { $in: storeFound.branches } });

        // recorro el array branches para ver si ya existe la nueva branch que quiero cargar
        if(branches.length>0){
            for (let i = 0; i < branches.length; i++) {
                if (branches[i].branchName == branchName) {
                //si la branch existe, no hago nada, salgo y doy un mensaje de error
                return res.status(401).json({ message: "Branch " + branchName + " already exist for this store" });     
                }
            }
        }

        

        next();
        
    } catch (error) {
        console.log("salgo por el catch")
        res.status(500).json({ message: error });
    }
};





export { checkBranchExisted, checkBranchIdExisted,checkBranchNameExistsInStore, };