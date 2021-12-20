import { config } from "dotenv";
config();

export default {
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost/apilenguadeloro",
  PORT: process.env.PORT || 4000,
  SECRET: 'ap1-l3nguad3l0r0'
};
