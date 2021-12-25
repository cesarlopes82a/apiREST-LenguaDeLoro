import config from "../config"
import mongoose from "mongoose";
import User from "../models/User";
import Role from "../models/Role";
import Store from "../models/Store";
import Branch from "../models/Branch";


export const createUserConnectionStack = (dbuserid) => {
if(dbuserid){
    if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
        if(dbuserid == "global"){
        var connection_uri = `${config.MONGODB_URI}`
        } else{
            var connection_uri = `${config.MONGODB_URI_URL}${dbuserid}`
        }

        //initiating one time unique connection 
        if(connection_uri){
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
    }
  }
}

export const createUserDB = async (user) => {
    if(user){
        var dbuserid = user._id
        if (typeof config.globalConnectionStack[dbuserid] === 'undefined') {
            createUserConnectionStack(dbuserid);
        }
        const newUserDB = new config.globalConnectionStack[dbuserid].user({
            username:user.username,
            email:user.email,
            password: user.password,
        });
        if(!newUserDB){
            return res.status(401).json({
                token: null,
                message: "Unable to create user db",
            });
        }
        
        
        const newUserDBSaved = await newUserDB.save();
        if(!newUserDBSaved){
            return res.status(401).json({
                token: null,
                message: "Unable to save user db",
            });
        }

        // actualizo la DB Global con id a la DB del usuario
        user.adminMasterDBuser = newUserDBSaved._id
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            user,
            {
            new: true,
            }
        );  
        if(!updatedUser){
            return res.status(401).json({
                token: null,
                message: "Unable to update global user db",
            });
        }
        return updatedUser;

    }
    
}

