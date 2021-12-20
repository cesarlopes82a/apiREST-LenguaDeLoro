import { Schema, model } from "mongoose";

const branchSchema = new Schema(
  {
    branchName: String,
    address: String
  },
  {
    versionKey: false,
  }
);

export default model("Branch", branchSchema);