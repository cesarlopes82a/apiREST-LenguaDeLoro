import { Schema, model } from "mongoose";

const stockSchema = new Schema(
  {
    producto: {
        type: Schema.Types.ObjectId,
        ref: "Product",
    },
    proveedor: {
        type: Schema.Types.ObjectId,
        ref: "Proveedor",
    },
    fechaDeCompra: { 
        type: Date, 
        default: Date.now 
    },
    fechaDeVencimiento: { 
        type: Date, 
        default: Date.now 
    },
    precioCompra: Number,
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Stock", stockSchema);

