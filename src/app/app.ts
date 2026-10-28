import express, { type Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cros from "cors";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(morgan("dev"));
app.use(cros());

export default app;
