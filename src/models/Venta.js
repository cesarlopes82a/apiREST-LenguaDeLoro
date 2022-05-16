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
        type: 'number', 
        autoIncrement: true 
    },
    productosVendidos: [{
        product:{
            type: Schema.Types.ObjectId,
            ref: "Product",
        },
        precioVta: Number
    }],
    totalVta: Number,
    cobroEfectivo: Number,
    cobroTarjeta: Number,
    cobroPendiente: Boolean,
    totalCobroPendiente: Number,
    comentarioVta: String,
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default model("Venta", ventaSchema);

