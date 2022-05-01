import { Schema, model } from "mongoose";

const proveedorSchema = new Schema(
  {
    proveedorName: String,
    nroContacto: String,
    emailContacto: String,
    descripProovedor: String,
    categoriaRubro: { type: Schema.Types.ObjectId,
        ref: "Category", },
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Proveedor", proveedorSchema);