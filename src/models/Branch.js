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
    stock:[{
        product: { type: Schema.Types.ObjectId,
        ref: "Product", },
        cantidad: Number,
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
    }
  },
  {
    versionKey: false,
  }
);

export default model("Branch", branchSchema);