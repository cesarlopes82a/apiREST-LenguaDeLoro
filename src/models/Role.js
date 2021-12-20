import { Schema, model } from "mongoose";

//export const ROLES = ["user", "admin", "moderator", "adminMaster"];

const roleSchema = new Schema(
  {
    roleName: String,
  },
  {
    versionKey: false,
  }
);

export default model("Role", roleSchema);
