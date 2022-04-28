import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    productName: String,
    unidadMedida: String,
    codigo: String,
    categoriaRubro: { type: Schema.Types.ObjectId,
                  ref: "Category", },
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Product", productSchema);

