import { Schema, model } from "mongoose";

const listadepreciosSchema = new Schema(
  {
    listaNombre: String,
    descripcion: String,
    products: [
        {
            type: Schema.Types.ObjectId,
            ref: "Product",
        },
        {
            precioVenta: Number,
        }
    ],
    creadapor: { type: Schema.Types.ObjectId,
      ref: "User", },
    fechaDeCreacion: { 
        type: Date, 
        default: Date.now 
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
    },

  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("ListaDePrecios", listadepreciosSchema);
