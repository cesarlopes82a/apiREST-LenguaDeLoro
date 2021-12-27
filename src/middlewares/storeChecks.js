import config from "../config";

const checkStoreExisted = async(req, res, next) => {
  try {
    const { storeName, dbuserid } = req.body;
    if (!storeName) return res.status(403).json({ message: "No store name provided" });
    if (!dbuserid) return res.status(403).json({ message: "No dbuserid name provided" });

    const storeFound = await config.globalConnectionStack[dbuserid].store.findOne({ storeName: storeName });

    if (storeFound) return res.status(400).json({ message: "The store already exists" });

    next();
    
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

const checkStoreIdExisted = async(req, res, next) => {
  try {
    const { storeid, dbuserid } = req.body;
    if (!storeid) return res.status(403).json({ message: "No storeid provided" });
    if (!dbuserid) return res.status(403).json({ message: "No dbuserid name provided" });

    const storeFound = await config.globalConnectionStack[dbuserid].store.findByid(storeid);

    if (storeFound) return res.status(400).json({ message: "The store already exists" });

    next();
    
  } catch (error) {
    res.status(500).json({ message: error });
  }
};
  export { checkStoreExisted, checkStoreIdExisted };