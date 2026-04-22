import { useEffect, useState } from "react";
import { setRefreshHandler } from "../services/api.js";
import { refreshToken, me } from "../services/services.js";
import { hasSession, setCurrentUser, clearTokens } from "../services/auth.js";

export function useAuth() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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
        const userData = await me();
        setCurrentUser(userData);
        setUser(userData);
        setIsAuth(true);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const loginSuccess = async () => {
    try{
      const userData = await me();
      setCurrentUser(userData);
      setUser(userData);
    } catch {
      // 
    }
    setIsAuth(true);
  };
  const logout = () => {
    clearTokens();
    setIsAuth(false);
    setUser(null);
  };

  return { isAuth, loading, user, loginSuccess, logout };
}