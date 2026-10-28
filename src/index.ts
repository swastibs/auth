import { createServer } from "node:http";
import { NODE_ENV, PORT } from "./app/shared/config/envConfig.js";
import chalk from "chalk";
import app from "./app/app.js";

function main() {
  try {
    const server = createServer(app);

    server.listen(PORT, () => {
      console.log(
        `Server is running on ${chalk.cyan(`http://localhost:${PORT}`)} in ${chalk.green(NODE_ENV)} mode`,
      );
    });
  } catch (error) {
    console.error(chalk.red("Error starting the server:"), error);
  }
}

main();
