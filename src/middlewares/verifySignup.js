import User from "../models/User";
import Role from "../models/Role";
import config from "../config";

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    if (!username) return res.status(400).json({ message: "Invalid user name" });
    if (!email) return res.status(400).json({ message: "Invalid email" });

    //esta parte la voy a sacar. el usuario puede estar repetido. lo que no puede estar repetido es el email.
    //solo el adminMaster se registra el resto de los usuarios para una DB los tiene que crear el adminMaster
    /*
    const userFound = await User.findOne({ username: req.body.username });
    if (userFound)
      return res.status(400).json({ message: "(8945)The user already exists" });
    */
    const emailFound = await User.findOne({ email: req.body.email });
    if (emailFound)
      return res.status(400).json({ message: "(8945)The email already exists" });
      
    next();
  } catch (error) {
    res.status(500).json({ message: error });
  }
};
const checkDuplicateUsernameInUserDB = async (req, res, next) => {
  const dbuserid = req.userDB;
  console.log("dbuserid " +dbuserid)
 
  console.log("vengo a verificar username duplicate")
  try {
    const { username } = req.body;
    console.log("este es el username: " +username)
    if (!username) return res.status(400).json({ message: "Invalid user name" });
    try {
      const userFound = await config.globalConnectionStack[dbuserid].user.findOne({ username: username });
      if (userFound)
        return res.status(400).json({ message: "The user already exists" });
    } catch (error) {
      console.log("Error al realizar consulta en la DB")
      console.log(error)
    }
    
      console.log("me voy de verificar username duplicate")
    next();
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

const checkRolesExisted = async(req, res, next) => {
  try {
    if (req.body.roles) {
      for (let i = 0; i < req.body.roles.length; i++) {
        const role = await Role.findOne({ roleName: req.body.roles[i] });
        if (!role)
        return res.status(400).json({ message: `Role ${req.body.roles[i]} does not exist` });
        /*
        if (!ROLES.includes(req.body.roles[i])) {
          return res.status(400).json({
            message: `Role ${req.body.roles[i]} does not exist`,
          });
        }
        */
      }
    }
    next();
    
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export { checkDuplicateUsernameOrEmail, checkRolesExisted, checkDuplicateUsernameInUserDB };
