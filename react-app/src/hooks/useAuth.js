import { useEffect, useState } from "react";
import { setRefreshHandler } from "../services/api.js";
import { refreshToken, me } from "../services/services.js";
import { hasSession, setCurrentUser, clearTokens } from "../services/auth.js";

export function useAuth() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRefreshHandler(refreshToken);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      if (!hasSession()) {
        setLoading(false);
        return;
      }

      try {
        const user = await me();
        setCurrentUser(user);
        setIsAuth(true);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const loginSuccess = () => setIsAuth(true);
  const logout = () => {
    clearTokens();
    setIsAuth(false);
  };

  return { isAuth, loading, loginSuccess, logout };
}