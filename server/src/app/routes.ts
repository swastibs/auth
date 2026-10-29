import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import ApiResponse from "./shared/utils/api-response.util.js";

const routes: Router = Router();

const formatUptime = (): string => {
	let remainingSeconds = Math.floor(process.uptime());
	const years = Math.floor(remainingSeconds / 31_536_000);
	remainingSeconds %= 31_536_000;
	const months = Math.floor(remainingSeconds / 2_592_000);
	remainingSeconds %= 2_592_000;
	const days = Math.floor(remainingSeconds / 86_400);
	remainingSeconds %= 86_400;
	const hours = Math.floor(remainingSeconds / 3_600);
	remainingSeconds %= 3_600;
	const minutes = Math.floor(remainingSeconds / 60);
	const seconds = remainingSeconds % 60;

	const parts: string[] = [];
	if (years > 0) parts.push(`${years}y`);
	if (months > 0) parts.push(`${months}mo`);
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0) parts.push(`${seconds}s`);

	return parts.length > 0 ? parts.join(", ") : "under 1s";
};

routes.get("/health", (_req, res) =>
	ApiResponse.ok(res, "server is running", { uptime: formatUptime() }),
);

routes.use("/api/v1/auth", authRoutes);

export default routes;