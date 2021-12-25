import { config } from "dotenv";
config();

const dbnameGLOBAL = 'apilenguadeloro';
const MONGODB_URI_URL = 'mongodb://localhost/';
const globalConnectionStack = [];

export default {
  dbnameGLOBAL,
  MONGODB_URI_URL,
  globalConnectionStack,
  MONGODB_URI: process.env.MONGODB_URI || `${MONGODB_URI_URL}${dbnameGLOBAL}`,
  PORT: process.env.PORT || 4000,
  SECRET: 'ap1-l3nguad3l0r0',
};
