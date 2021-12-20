import User from "../models/User";
import Role from "../models/Role";
import Store from "../models/Store";

export const createUser = async (req, res) => {
  try {
    const { username, email, password, roles } = req.body;

    //aca verifico si me estan pasando roles. si me pasan algun rol, luego voy a mapear solo el id
    const rolesFound = await Role.find({ roleName: { $in: roles } });

    // creating a new User
    const user = new User({
      username,
      email,
      password,
      roles: rolesFound.map((role) => role._id), //esto da a confucion la palabra (role) y role. son solo re referencia.
    });

    // encrypting password
    user.password = await User.encryptPassword(user.password);

    // saving the new user
    const savedUser = await user.save();

    return res.status(200).json({
      _id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      roles: savedUser.roles,
    });
  } catch (error) {
    console.error(error);
  }
};

export const getUserById = async (req, res) => {
  const { userId } = req.body;
  const userFound = await User.findById(userId);
  res.status(200).json(userFound);
};

export const updateUserById = async (req, res) => {  //ojo con esto. no enviar el password!!! actualizarlo de otra forma!!
  try {
    const { userId } = req.params;  //se usa el req.params porque viene el id en la barra de direccion.
    const updatedUser = await User.findByIdAndUpdate(
    userId,
    req.body,
    {
      new: true,  // esto es para que me devuelva el objeto actualizado. por defecto me devuelve el objeto viejo(antes del update)
    }
  );
  res.status(204).json(updatedUser);
  } catch (error) {
    console.error(error);
  }
  
};

export const getUsers = async (req, res) => {};

export const getUser = async (req, res) => {};

export const addUserStoreByID = async (req, res) => {
  try {
    const { storeId } = req.body;

    if(!storeId) return res.status(401).json({ message: "No storeId received" });
    if(!req.userId) return res.status(401).json({ message: "No userId received" }); //esta variable userId deberia venir de cuando verificamos el token en el middleware

    const storeFound = await Store.findById(storeId);
    if(!storeFound) return res.status(401).json({ message: "Store not found" });
    const userFound = await User.findById(req.userId);
    if(!userFound) return res.status(401).json({ message: "User not found" });

    //verificamos si el usuario ya tiene la tienda/store cargada en su perfil
    const stores = await Store.find({ _id: { $in: userFound.stores } });
    for (let i = 0; i < stores.length; i++) {
      if (stores[i]._id == storeId) {
        return res.status(401).json({ message: "Store already added to this user" });;     
      }
    }

    userFound.stores.push(storeId)
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      userFound,
      {
        new: true,
      }
    );

    res.status(204).json(updatedUser);

    
  } catch (error) {
    console.error(error);
  }
};

