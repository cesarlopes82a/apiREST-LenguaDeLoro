import User from "../models/User";
import Role from "../models/Role";
import Store from "../models/Store";
import Branch from "../models/Branch";
import mongoose from "mongoose";
import config from "../config";
/*
export const dbuserSingIn = async (req, res, next) => {
const { dbuserid } = req.body;
console.log("aca viene el dbuserid desde el middleware: " + dbuserid)
if(dbuserid){
    if(dbuserid == "global"){
        var connection_uri = `mongodb://localhost/apilenguadeloro`
    } else{
        var connection_uri = `mongodb://localhost/${dbuserid}`
    }
    
    console.log("paso esto desde el middleware " + connection_uri)
    //initiating one time unique connection 
    config.globalConnectionStack[dbuserid] = {};
    config.globalConnectionStack[dbuserid].db = mongoose.createConnection(connection_uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    });
    
    config.globalConnectionStack[dbuserid].user = config.globalConnectionStack[dbuserid].db.model('User',User.userSchema);
    config.globalConnectionStack[dbuserid].role = config.globalConnectionStack[dbuserid].db.model('Role',Role.roleSchema);
    config.globalConnectionStack[dbuserid].store = config.globalConnectionStack[dbuserid].db.model('Store',Store.storeSchema);
    config.globalConnectionStack[dbuserid].branch = config.globalConnectionStack[dbuserid].db.model('Branch',Branch.branchSchema);
    
}

return next();

};

export { dbuserSingIn };

*/