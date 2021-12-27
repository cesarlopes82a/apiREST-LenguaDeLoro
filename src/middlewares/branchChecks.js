import config from "../config";

const checkBranchExisted = async(req, res, next) => {
    try {
        const { branchName, dbuserid } = req.body;
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
    try {
        const { branchid, dbuserid } = req.body;
        if (!branchid) return res.status(403).json({ message: "No branchid provided" });
        if (!dbuserid) return res.status(403).json({ message: "No dbuserid name provided" });

        const branchFound = await config.globalConnectionStack[dbuserid].branch.findByid(branchid);

        if (branchFound) return res.status(400).json({ message: "The branchid already exists" });

        next();
        
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export { checkBranchExisted, checkBranchIdExisted };