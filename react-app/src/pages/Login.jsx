import { useEffect, useState } from "react";
import {
  clearTokens,
  clearBusinessCache,
  getLastUserId,
  hasSession,
  setCurrentUser
} from "../services/auth.js";

import { setRefreshHandler } from "../services/api.js";
import { login, me, refreshToken } from "../services/services"

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // equivalente a setRefreshHandler
  useEffect(() => {
    setRefreshHandler(refreshToken);
  }, []);

  // 🔥 bootstrap (equivalente al tuyo)
  useEffect(() => {
    const bootstrap = async () => {
      if (!hasSession()) return;

      try {
        const user = await me();
        setCurrentUser(user);
        onLogin(); // en vez de redirect
      } catch {
        clearTokens();
      }
    };

    bootstrap();
  }, [onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(username.trim(), password);

      const user = await me();

      const previousUserId = getLastUserId();
      const currentUserId = user?.id != null ? String(user.id) : "";

      if (previousUserId && currentUserId && previousUserId !== currentUserId) {
        clearBusinessCache();
      }

      setCurrentUser(user);

      onLogin(); // reemplaza window.location.href
    } catch (err) {
      if (err?.status === 429) {
        setError("Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
      } else {
        setError(err?.message || "No se pudo iniciar sesión");
      }
    }
  };

  return (
    <div className="login-page">
      <div className="bg-shape bg-shape-a"></div>
      <div className="bg-shape bg-shape-b"></div>

      <section className="panel login-card">
        <p className="eyebrow">Acceso interno</p>
        <h1 className="login-title">Ingresar al sistema</h1>
        <p className="login-subtitle">
          Usá tu usuario del estudio para entrar al panel de gestión.
        </p>

        <form onSubmit={handleSubmit} className="inline-form">
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="btn btn-primary" type="submit">
            Iniciar sesión
          </button>
        </form>

        {error && (
          <pre className="system-log">{error}</pre>
        )}
      </section>
    </div>
  );
}

export default Login;
