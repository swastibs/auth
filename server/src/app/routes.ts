import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";

const routes: Router = Router();

routes.use("/api/v1/auth", authRoutes);

export default routes;