import { jwtDecode } from "jwt-decode";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// In-memory token storage for improved XSS resistance
let inMemoryAccessToken = null;

// Access Token Helpers
export const getAccessToken = () => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (stored) {
    inMemoryAccessToken = stored;
    return stored;
  }
  return null;
};

export const getToken = getAccessToken; // Backward compatibility

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

export const setToken = setAccessToken; // Backward compatibility

// Refresh Token Helpers - isolate from permanent localStorage (stored in sessionStorage)
export const getRefreshToken = () => sessionStorage.getItem(REFRESH_TOKEN_KEY);

export const setRefreshToken = (token) => {
  if (token) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// Store both tokens
export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken !== undefined) setAccessToken(accessToken);
  if (refreshToken !== undefined) setRefreshToken(refreshToken);
};

// Clear all tokens
export const clearTokens = () => {
  inMemoryAccessToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  // Also clean up any legacy keys
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem("token");
};

export const removeToken = clearTokens; // Backward compatibility

// Check if a token is not expired
export const isTokenValid = (token = getAccessToken()) => {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    return typeof decoded.exp === "number" && decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

// Extract user payload from decoded JWT
export const getUserFromToken = (token = getAccessToken()) => {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return {
      id: decoded.id || decoded._id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
  } catch {
    return null;
  }
};
