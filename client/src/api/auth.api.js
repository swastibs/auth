import axiosInstance from "./axios.js";
import { getRefreshToken } from "../utils/token.js";

const unwrapAuthPayload = (payload = null) => {
  if (!payload) return { user: null, accessToken: null, refreshToken: null };

  const tokens = payload.tokens ?? payload;
  const accessToken = tokens?.accessToken ?? payload.accessToken ?? null;
  const refreshToken = tokens?.refreshToken ?? payload.refreshToken ?? null;

  return {
    ...payload,
    user: payload.user ?? null,
    accessToken,
    refreshToken,
    tokens: tokens && typeof tokens === "object" ? tokens : { accessToken, refreshToken },
  };
};

const normalizeResponse = (response) => {
  if (!response) return null;
  if (response.status === 204) {
    return { success: true };
  }

  return response.data?.data ?? response.data ?? null;
};

/**
 * Authentication API Service
 * Matches the backend contract mounted under /api/v1/auth.
 */
export const authApi = {
  async register(data) {
    const response = await axiosInstance.post("/auth/register", data);
    return unwrapAuthPayload(normalizeResponse(response));
  },

  async login(credentials) {
    const response = await axiosInstance.post("/auth/login", credentials);
    return unwrapAuthPayload(normalizeResponse(response));
  },

  async refreshToken(refreshToken) {
    const response = await axiosInstance.post("/auth/refresh", {
      refreshToken,
    });
    return unwrapAuthPayload(normalizeResponse(response));
  },

  async getMe() {
    const response = await axiosInstance.get("/auth/me");
    return response.data?.data?.user ?? response.data?.data ?? null;
  },

  async logout(refreshToken = getRefreshToken()) {
    const response = await axiosInstance.post("/auth/logout", {
      refreshToken,
    });
    return normalizeResponse(response) ?? { success: true };
  },

  async logoutAll(refreshToken = getRefreshToken()) {
    const response = await axiosInstance.post("/auth/logout-all", {
      refreshToken,
    });
    return normalizeResponse(response) ?? { success: true };
  },

  async verifyEmail(token) {
    const response = await axiosInstance.get(`/auth/verify-email/${encodeURIComponent(token)}`);
    return normalizeResponse(response);
  },

  async resendVerification(email) {
    const response = await axiosInstance.post("/auth/resend-verification", { email });
    return normalizeResponse(response);
  },

  async forgotPassword(email) {
    const response = await axiosInstance.post("/auth/forgot-password", { email });
    return normalizeResponse(response);
  },

  async resetPassword(token, newPassword) {
    const response = await axiosInstance.post(`/auth/reset-password/${encodeURIComponent(token)}`, {
      newPassword,
    });
    return normalizeResponse(response);
  },

  async changePassword(currentPassword, newPassword) {
    const response = await axiosInstance.post("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return normalizeResponse(response);
  },
};

export default authApi;
