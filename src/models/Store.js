import { Schema, model } from "mongoose";

const storeSchema = new Schema(
  {
    storeName: String,
    branches: [
        {
          type: Schema.Types.ObjectId,
          ref: "Branch",
        },
      ],
    products:[
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    listasdeprecios: [
      {
        type: Schema.Types.ObjectId,
        ref: "ListaDePrecios",
      },
    ],
    defaultListaDP:{
      type: Schema.Types.ObjectId,
      ref: "ListaDePrecios",
      default: null,
    },
    createdBy:{
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    }
  },
  {
    versionKey: false,
  }
);



export default model("Store", storeSchema);
