import { createServer } from "node:http";
import chalk from "chalk";

import app from "./app/app.js";
import connectDB from "./app/shared/config/db.config.js";
import { NODE_ENV, PORT } from "./app/shared/config/env.config.js";
import { NODE_ENV_LABEL } from "./app/shared/constants/env.constant.js";

async function main() {
  try {
    await connectDB();

    const server = createServer(app);

    server.on("error", (err) => {
      console.error(chalk.red("Server error:"), err);
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(
        `Server is running on ${chalk.cyan(
          `http://localhost:${PORT}`,
        )} in ${chalk.green(NODE_ENV_LABEL[NODE_ENV])} mode`,
      );
    });
  } catch (error) {
    console.error(chalk.red("Error starting the server:"), error);
    process.exit(1);
  }
}

main();
