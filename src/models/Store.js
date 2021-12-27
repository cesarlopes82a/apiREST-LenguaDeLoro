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
  },
  {
    versionKey: false,
  }
);



export default model("Store", storeSchema);
