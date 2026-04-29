import { logout } from "../services/services";

function Header({ user }) {
  const handleLogout = async () => {
    await logout();
    window.location.reload(); // simple por ahora
  };

  const sessionLabel = user 
  ? `Sesión: ${user.username} (${user.role})` 
  : "Sin sesión";

  return (
    <header className="hero">
      <p className="eyebrow">Gestión interna</p>
      <h1>Sistema de Ahorro para Viviendas</h1>
      <p className="subtitle">
        Controlá planes, cuotas, adjudicaciones y simulación financiera.
      </p>

      <div className="session-bar">
        <p id="session-status">{sessionLabel}</p>
        <button id="btn-logout" className="btn btn-secondary" type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

export default Header;
