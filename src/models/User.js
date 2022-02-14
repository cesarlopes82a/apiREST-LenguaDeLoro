import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    stores: [{
      type: Schema.Types.ObjectId,
      ref: "Store",
    }],


    tiendas: [{
      store: { type: Schema.Types.ObjectId,
        ref: "Store", },
      branches: [{
        type: Schema.Types.ObjectId,
        ref: "Branch",
      }],
    }],

    branches: [{
      type: Schema.Types.ObjectId,
      ref: "Branch",
    }],
    roles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    adminMasterDBuser: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// creamos los metodos para encriptar y comparar un password
userSchema.statics.encryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

userSchema.statics.comparePassword = async (password, receivedPassword) => {
  return await bcrypt.compare(password, receivedPassword)
}


export default model("User", userSchema);
