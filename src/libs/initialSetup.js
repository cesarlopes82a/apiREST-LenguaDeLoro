import Role from "../models/Role";
import User from "../models/User";

import bcrypt from "bcryptjs";

export const createRoles = async () => {
  try {
    // Count Documents
    const count = await Role.estimatedDocumentCount();

    // check for existing roles
    if (count > 0) return;

    // Create default Roles
    const values = await Promise.all([
      new Role({ roleName: "adminMaster" }).save(),
      new Role({ roleName: "user" }).save(),
    ]);

    console.log(values);
  } catch (error) {
    console.error(error);
  }
};

// aca creamos un usuario administrador por defecto
export const createAdmin = async () => {
  // check for an existing admin user
  const user = await User.findOne({ email: "adminmaster@localhost" });
  // get roles _id
  const roles = await Role.find({ name: { $in: ["adminMaster","admin", "moderator"] } });

  if (!user) {
    // create a new admin user
    await User.create({
      username: "adminmaster",
      email: "adminmaster@localhost",
      password: await bcrypt.hash("password", 10),
      adminMasterDBuser: "123456",
      roles: roles.map((role) => role._id),
    });
    console.log('AdminMaster User Created!')
  }
};


