import "dotenv/config";

export const PORT: number = Number(process.env.PORT ?? 8080);
export const NODE_ENV: string = String(process.env.NODE_ENV ?? "development");
