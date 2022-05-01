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
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("ListaDePrecios", listadepreciosSchema);
