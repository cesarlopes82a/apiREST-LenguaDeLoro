import { Schema, model } from "mongoose";

const compraSchema = new Schema(
  {
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    proveedorId: {
        type: Schema.Types.ObjectId,
        ref: "Proveedor",
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
  },
    cantidad: Number,
    precioCompraUnitario: Number,
    fechaDeCompra: { 
        type: Date, 
        default: Date.now 
    },
    fechaDeVencimiento: { 
        type: Date, 
        default: Date.now 
    },
    comentario: String,
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Compra", compraSchema);

