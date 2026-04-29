import { useState } from "react";
import { getCurrentUser } from "../services/auth.js";
import { crearUsuario } from "../services/services.js";

function AdminPanel() {
  const user = getCurrentUser();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");
    const role = String(data.get("role") || "operador");

    if (!["admin", "operador"].includes(role)) {
      setStatus("Rol inválido. Solo se permite admin u operador.");
      return;
    }

    setLoading(true);
    setStatus("");
    try {
      const nuevoUser = await crearUsuario(username, password, role);
      e.target.reset();
      setStatus(`Usuario "${nuevoUser.username}" creado con rol "${nuevoUser.role}".`);
    } catch (err) {
      setStatus(err?.message || "Error al crear usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="admin-panel" className="panel panel-admin">
      <div className="panel-head">
        <h2>Panel administrador</h2>
        <p>Perfil admin</p>
      </div>

      <div className="admin-user-box">
        <p>
          {user
            ? `ID ${user.id} | ${user.username} | ${user.role} | activo: ${user.is_active ? "sí" : "no"}`
            : "Cargando datos de sesión..."}
        </p>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Nuevo usuario"
          minLength={3}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password (min 8)"
          minLength={8}
          required
        />
        <select name="role" aria-label="Rol de nuevo usuario" required>
          <option value="operador">operador</option>
          <option value="admin">admin</option>
        </select>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creando..." : "Crear usuario"}
        </button>
      </form>

      {status && (
        <p className="config-help" style={{ marginTop: "0.6rem" }}>
          {status}
        </p>
      )}
    </section>
  );
}

export default AdminPanel;