import { useState, useCallback, useEffect } from "react";
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getUserFromToken,
  isTokenValid,
} from "../utils/token";
import authApi from "../api/auth.api";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => {
    // Only set user immediately if access token is currently valid
    if (isTokenValid()) {
      return getUserFromToken();
    }
    // Do NOT clear tokens here: if access token is expired or missing,
    // a valid refresh token might exist to restore the session in initializeAuth.
    return null;
  });

  // Verify and fetch fresh user profile on initial mount
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      // If no tokens exist at all, clear any residual state and stop
      if (!accessToken && !refreshToken) {
        if (active) {
          clearTokens();
          setUser(null);
          setLoading(false);
        }
        return;
      }

      // If access token is valid, attempt to fetch user profile
      if (accessToken && isTokenValid(accessToken)) {
        try {
          const userProfile = await authApi.getMe();
          if (active) {
            setUser(userProfile);
          }
        } catch (error) {
          // If profile fetch fails with 401 and refresh wasn't able to recover
          if (
            active &&
            (!error.config?._retry || error.response?.status === 401)
          ) {
            clearTokens();
            setUser(null);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
        return;
      }

      // If access token is missing or expired, but refresh token exists, attempt refresh
      if (refreshToken) {
        try {
          const refreshData = await authApi.refreshToken(refreshToken);
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            refreshData;
          setTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          // Fetch full user profile with newly acquired access token
          const userProfile = await authApi.getMe();
          if (active) {
            setUser(userProfile);
          }
        } catch (refreshError) {
          console.warn(
            "Failed to restore session via refresh token:",
            refreshError.message,
          );
          if (active) {
            clearTokens();
            setUser(null);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
        return;
      }

      // Access token was invalid and no refresh token exists
      if (active) {
        clearTokens();
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  /**
   * Log in user with email & password
   */
  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    const { user: loggedInUser, accessToken, refreshToken } = data;

    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
    }
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  /**
   * Register a new user
   */
  const register = useCallback(
    async ({ name, email, password, preferences }) => {
      const data = await authApi.register({
        name,
        email,
        password,
        preferences,
      });
      const { user: registeredUser, accessToken, refreshToken } = data;

      if (accessToken && refreshToken) {
        setTokens({ accessToken, refreshToken });
      }
      setUser(registeredUser);
      return registeredUser;
    },
    [],
  );

  // Backward compatibility alias supporting both object and argument signatures
  const signup = useCallback(
    async (firstArg, email, password) => {
      if (typeof firstArg === "object" && firstArg !== null) {
        return register(firstArg);
      }
      return register({ name: firstArg, email, password });
    },
    [register],
  );

  const logout = useCallback(async () => {
    try {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if ((!accessToken || !isTokenValid(accessToken)) && refreshToken) {
        try {
          const refreshData = await authApi.refreshToken(refreshToken);
          setTokens({
            accessToken: refreshData.accessToken,
            refreshToken: refreshData.refreshToken,
          });
        } catch (refreshErr) {
          console.warn(
            "Could not refresh token before logout:",
            refreshErr.message,
          );
        }
      }

      const currentRefreshToken = getRefreshToken();
      await authApi.logout(currentRefreshToken);
    } catch (error) {
      console.warn("Backend logout failed or was unreachable:", error.message);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      await authApi.logoutAll(refreshToken);
    } catch (error) {
      console.warn("Backend logoutAll failed or was unreachable:", error.message);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    return authApi.resetPassword(token, newPassword);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return authApi.changePassword(currentPassword, newPassword);
  }, []);

  const resendVerification = useCallback(async (email) => {
    return authApi.resendVerification(email);
  }, []);

  const verifyEmail = useCallback(async (token) => {
    return authApi.verifyEmail(token);
  }, []);

  /**
   * Refetch current user profile
   */
  const refreshProfile = useCallback(async () => {
    try {
      const userProfile = await authApi.getMe();
      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      return null;
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    signup,
    logout,
    logoutAll,
    forgotPassword,
    resetPassword,
    changePassword,
    resendVerification,
    verifyEmail,
    refreshProfile,
    isAuthenticated: Boolean(user),
    updateUser: setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
