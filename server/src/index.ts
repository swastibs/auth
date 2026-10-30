import { createServer } from "node:http";
import chalk from "chalk";

import app from "./app/app.js";
import connectDB from "./app/shared/config/db.config.js";
import { closeRedis, getRedisClient } from "./app/shared/config/redis.config.js";
import { NODE_ENV, PORT } from "./app/shared/config/env.config.js";
import { NODE_ENV_LABEL } from "./app/shared/constants/env.constant.js";

async function main() {
  try {
    await connectDB();
    getRedisClient();

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

    let shuttingDown = false;
    const shutdown = async (signal: string): Promise<void> => {
      if (shuttingDown) return;
      shuttingDown = true;

      console.log(chalk.yellow(`\n${signal} received — shutting down…`));
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await closeRedis();
      process.exit(0);
    };

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.on(signal, () => {
        void shutdown(signal).catch((error: unknown) => {
          console.error(chalk.red("Error during graceful shutdown:"), error);
          process.exit(1);
        });
      });
    }
  } catch (error) {
    console.error(chalk.red("Error starting the server:"), error);
    process.exit(1);
  }
}

main();
