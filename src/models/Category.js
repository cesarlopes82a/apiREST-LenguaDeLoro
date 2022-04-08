import { Schema, model } from "mongoose";

const categorySchema = new Schema(
  {
    categoryName: String,
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Category", categorySchema);