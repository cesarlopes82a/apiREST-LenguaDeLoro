import { Schema, model } from "mongoose";

const ventaSchema = new Schema(
  {
    branchId: {
        type: Schema.Types.ObjectId,
        ref: "Branch",
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    fechaDeVta: { 
        type: Date, 
        default: Date.now 
    },
    vtaNumero: { 
        type: Number,
        autoIncrement: true 
    },
    productosVendidos: [{
        product:{
            type: Schema.Types.ObjectId,
            ref: "Product",
        },
        nombre: String,
        codigo: String,
        precio: Number,
        cantidad: Number,
        rubro: String,
        total: Number,
    }],
    totalVta: Number,
    montoEfectivo: { 
      type: Number, 
      default: 0
    },
    montoTarjeta: { 
      type: Number, 
      default: 0
    },
    comentarioVta: { 
      type: String, 
      default: null 
    },
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Venta", ventaSchema);

