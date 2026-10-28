import mongoose from "mongoose";
import chalk from "chalk";

import { NODE_ENV_LABEL } from "../constants/env.constant.js";
import { MONGO_URI, NODE_ENV } from "./env.config.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);

    console.log(
      `MongoDB Connected Successfully [${chalk.bold(NODE_ENV_LABEL[NODE_ENV])}]`,
    );

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${chalk.red(String(error))}`);
    throw error;
  }
};

export default connectDB;
