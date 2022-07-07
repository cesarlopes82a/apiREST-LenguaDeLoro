import { Schema, model } from "mongoose";

const branchSchema = new Schema(
  {
    branchName: String,
    address: String,
    storeId: { type: Schema.Types.ObjectId,
      ref: "Store", 
    },
    compras:[
      { type: Schema.Types.ObjectId,
      ref: "Compra", },
    ],
    ventas:[
      { type: Schema.Types.ObjectId,
      ref: "Venta", },
    ],
    stock:[{
        product: { type: Schema.Types.ObjectId,
          ref: "Product", },        
        ultimoRegCompra: { type: Schema.Types.ObjectId,
          ref: "Compra", 
          default: null},
        fechaUltimaCompra: String,
        precioUnitUltCompra: Number,
        cantidad: Number,
        ajustes:[{
          fechaAjuste: String,
          justificacion: String,
          accion: String,
          cantidad: Number
        }]
      }
    ],
    listasdeprecios:[{
        product: { type: Schema.Types.ObjectId,
        ref: "ListaDePrecios", }
      }
    ],

    defaultListaDP:{
      type: Schema.Types.ObjectId,
      ref: "ListaDePrecios",
      default: null,
    },
    createdBy:{
      type: Schema.Types.ObjectId,
      ref: "User",
    }
  },
  {
    versionKey: false,
  }
);

export default model("Branch", branchSchema);