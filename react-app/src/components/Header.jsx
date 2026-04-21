import { logout } from "../services/services";

function Header() {
  const handleLogout = async () => {
    await logout();
    window.location.reload(); // simple por ahora
  };

  return (
    <header className="hero">
      <p className="eyebrow">Gestión interna</p>
      <h1>Sistema de Ahorro para Viviendas</h1>
      <p className="subtitle">
        Controlá planes, cuotas, adjudicaciones y simulación financiera.
      </p>

      <div className="session-bar">
        <p>Sesión activa</p>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

export default Header;
