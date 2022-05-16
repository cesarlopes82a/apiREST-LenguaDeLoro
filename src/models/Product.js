import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    productName: String,
    unidadMedida: String,
    codigo: String,
    stock: {
      type: Number,
      default: 0,
    },
    storeId: { type: Schema.Types.ObjectId,
      ref: "Store", },
    categoriaRubro: { type: Schema.Types.ObjectId,
                  ref: "Category", },
    ultimoRegCompra: { type: Schema.Types.ObjectId,
      ref: "Compra", 
      default: null},
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Product", productSchema);

