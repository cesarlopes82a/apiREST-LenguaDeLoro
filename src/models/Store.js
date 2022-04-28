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
  },
  {
    versionKey: false,
  }
);



export default model("Store", storeSchema);
