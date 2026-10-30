const ENV_OPTIONS = ["development", "staging", "production"];

const normalizeEnv = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return ENV_OPTIONS.includes(normalized) ? normalized : "development";
};

const DEFAULT_API_BASE_URLS = {
  development: "http://localhost:8080/api/v1",
  staging: "https://atomictask.onrender.com/api/v1",
  production: "https://atomictask.onrender.com/api/v1",
};

export const NODE_ENV = normalizeEnv(
  import.meta.env.VITE_APP_ENV ||
    import.meta.env.VITE_NODE_ENV ||
    import.meta.env.MODE ||
    "development",
);

export const APP_ENV = NODE_ENV;
export const isDevelopment = NODE_ENV === "development";
export const isStaging = NODE_ENV === "staging";
export const isProduction = NODE_ENV === "production";

export const API_BASE_URL = (() => {
  const configured = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return DEFAULT_API_BASE_URLS[NODE_ENV] || DEFAULT_API_BASE_URLS.development;
})();

export const ENV_CONFIG = {
  NODE_ENV,
  APP_ENV,
  isDevelopment,
  isStaging,
  isProduction,
  API_BASE_URL,
  DEFAULT_API_BASE_URLS,
};
