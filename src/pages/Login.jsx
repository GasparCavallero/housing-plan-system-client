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

const EyeVisible = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    style={{ width: '100%', height: '100%', display: 'block' }} // 🔥 Asegura nitidez
    fill="currentColor" // Hereda el color del div que creamos arriba
  >
    <path d="M12,9c-1.66,0-3,1.34-3,3s1.34,3,3,3s3-1.34,3-3S13.66,9,12,9z M12,17c-2.76,0-5-2.24-5-5s2.24-5,5-5s5,2.24,5,5 S14.76,17,12,17z M12,4.5c-5,0-9.27,3.11-11,7.5c1.73,4.39,6,7.5,11,7.5s9.27-3.11,11-7.5C21.27,7.61,17,4.5,12,4.5z"/>
  </svg>
);

const EyeHidden = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    style={{ width: '100%', height: '100%', display: 'block' }} // 🔥 Asegura nitidez
    fill="currentColor"
  >
    <path d="M12,17c1.1,0,2.12-0.41,2.92-1.08l1.45,1.45c-1.2,1.03-2.71,1.63-4.37,1.63c-5,0-9.27-3.11-11-7.5 c1.02-2.58,2.85-4.73,5.16-6.11L7.84,7.06C6.51,8.18,5.44,9.66,4.75,11.33c1.64,3.53,5.19,5.67,9.25,5.67 c0.67,0,1.32-0.06,1.94-0.17L14.7,15.6C13.9,16.48,12.72,17,12,17z M12,7c-0.67,0-1.32,0.06-1.94,0.17L8.3,5.4 C9.5,4.83,10.72,4.5,12,4.5c5,0,9.27,3.11,11,7.5c-0.69,1.76-1.79,3.31-3.19,4.51l-1.47-1.47c1.05-1.01,1.9-2.25,2.45-3.64 c-1.64-3.53-5.19-5.67-9.25-5.67c-1.1,0-2.12,0.41-2.92,1.08L6.16,5.34C7.81,4.8,9.45,4.5,12,4.5z M12,9c1.66,0,3,1.34,3,3 c0,0.35-0.07,0.69-0.18,1l-3.82-3.82C11.31,9.07,11.65,9,12,9z M9.18,10.18l3.64,3.64c-0.26,0.11-0.54,0.18-0.82,0.18 c-1.66,0-3-1.34-3-3C10,10.72,10.07,10.44,10.18,10.18z"/>
  </svg>
);

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 1. Estado para mostrar/ocultar contraseña
  const [showPassword, setShowPassword] = useState(false);

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

          {/* 2. Contenedor para el input y el botón */}
          <div className="password-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
            <div className="password-container" style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                // Un padding-right generoso para que el texto largo no pise el icono
                style={{ width: '100%', paddingRight: '45px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',       // 🔥 Fundamental
                  alignItems: 'center',  // 🔥 Fundamental
                  justifyContent: 'center', // 🔥 Fundamental
                  padding: '0',
                  width: '24px',  // Un poco más grande que el SVG
                  height: '24px', // Un poco más grande que el SVG
                  zIndex: 2,
                }}
              >
                {/* 🔥 Ponemos el icono en un div contenedor para aislar su CSS */}
                <div style={{
                  display: 'flex',
                  width: '18px',  // Forzamos el tamaño exacto del icono aquí
                  height: '18px',
                  color: '#666',   // Forzamos el color gris oscuro
                  aspectRatio: '1/1', // Forzamos que sea cuadrado
                }}>
                  {showPassword ? <EyeHidden /> : <EyeVisible />}
                </div>
              </button>
            </div>
          </div>

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
