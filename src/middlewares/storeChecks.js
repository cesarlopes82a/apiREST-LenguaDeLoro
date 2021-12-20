import Store from "../models/Store";

const checkStoreExisted = async(req, res, next) => {
    try {
      const { storeName } = req.body;
      if (!storeName) return res.status(403).json({ message: "No store name provided" });

      const storeFound = await Store.findOne({ storeName: storeName });

      if (storeFound) return res.status(400).json({ message: "The store already exists" });

      next();
      
    } catch (error) {
      res.status(500).json({ message: error });
    }
  };

  export { checkStoreExisted };