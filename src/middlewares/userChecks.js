import User from "../models/User";

export const findUserinGlobanDB = async (req, res, next) => {
    try {
        const { dbuserid } = req.body;  //dbuserid me dice en que db tengo que escribir

        //VERIFICO si tengo un formato valido de id
        if (!dbuserid.match(/^[0-9a-fA-F]{24}$/)){
            return res.status(400).json({ message: "Invalid user ID: " + dbuserid });
        } 

        const userFound = await User.findById(dbuserid);    //busco el user id en base de datos global

        if(!userFound) return res.status(403).json({ message: "User id: " + dbuserid + "not found in global DB" });
  
        next();
      
    } catch (error) {
      console.log(error)
      return res.status(500).send({ message: error });
    }
  };