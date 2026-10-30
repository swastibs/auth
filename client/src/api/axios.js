import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../utils/token.js";

const env =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env
    : (typeof globalThis !== "undefined" && globalThis.process?.env) || {};

const normalizeApiBaseUrl = (baseUrl) => {
  const raw = String(baseUrl || "").trim();
  if (!raw) return "http://localhost:8080/api/v1";

  const trimmed = raw.replace(/\/+$/, "");
  if (trimmed.endsWith("/api/v1")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/v1`;
  if (trimmed.endsWith("/v1")) return trimmed;
  return `${trimmed}/api/v1`;
};

const API_URL = normalizeApiBaseUrl(
  env.VITE_API_BASE_URL || env.VITE_API_URL || "http://localhost:8080/api/v1",
);

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization header if access token exists
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor with automatic token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Normalizing error object for consistent UI error handling
    if (error.response) {
      error.normalized = {
        message: error.response.data?.message || "Something went wrong",
        errors: error.response.data?.errors,
        status: error.response.status,
        retryAfter: error.response.headers?.["retry-after"],
      };
    }

    const isAuthRoute =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    // Handle 401 Unauthorized
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRoute
    ) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/signup"
        ) {
          window.location.assign("/login");
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue pending requests while refreshing and set _retry before retrying
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );

        const refreshPayload = refreshResponse.data?.data ?? refreshResponse.data ?? {};
        const newAccessToken =
          refreshPayload.tokens?.accessToken ?? refreshPayload.accessToken;
        const newRefreshToken =
          refreshPayload.tokens?.refreshToken ?? refreshPayload.refreshToken;

        if (!newAccessToken || !newRefreshToken) {
          throw new Error("Refresh response did not include tokens");
        }

        setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/signup"
        ) {
          window.location.assign("/login");
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
