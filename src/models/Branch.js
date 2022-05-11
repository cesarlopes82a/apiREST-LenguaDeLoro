import { Schema, model } from "mongoose";

const branchSchema = new Schema(
  {
    branchName: String,
    address: String,
    compras:[
      { type: Schema.Types.ObjectId,
      ref: "Compra", },
    ],
    stock:[{
        product: { type: Schema.Types.ObjectId,
        ref: "Product", },
        cantidad: Number,
      }
    ]

  },
  {
    versionKey: false,
  }
);

export default model("Branch", branchSchema);