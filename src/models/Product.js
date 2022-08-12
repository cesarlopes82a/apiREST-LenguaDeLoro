import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    productName: String,
    unidadMedida: String,
    codigo: String,
    storeId: { 
      type: Schema.Types.ObjectId,
      ref: "Store", },
    categoriaRubro: { 
      type: Schema.Types.ObjectId,
      ref: "Category", },
    desactivado:{
      estado:{ type: Boolean, default: false },
      desactivadoPor: { type: String, default: null },
      desactivadoFecha: { type: String, default: null },
    }

  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Product", productSchema);

