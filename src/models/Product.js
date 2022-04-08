import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    productName: String,
    codigo: String,
    categoria: { type: Schema.Types.ObjectId,
                  ref: "Category", },
    imgURL: String,
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Product", productSchema);
