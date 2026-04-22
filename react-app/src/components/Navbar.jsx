function Navbar({ setSection, user }) {
  const isAdmin = user?.role === "admin";

  return (
    <nav className="section-nav" aria-label="Navegación de secciones">
      {isAdmin && (
        <a id="nav-link-admin" 
        href="#admin-panel" 
        onClick={(e) => {
          e.preventDefault();
          setSection("admin")
        }}
        >
          Admin
        </a>
      )}
      <a href="#simulaciones-guardadas" onClick={(e) => {
        e.preventDefault();
        setSection("simulaciones")
      }}>
        Simulaciones guardadas
      </a>
      <a href="#configuracion" onClick={(e) => {
        e.preventDefault();
        setSection("configuracion")
      }}>
        Configuración + Estado
      </a>
      <a href="#simulacion" onClick={(e) => {
        e.preventDefault();
        setSection("simulacion")
      }}>
        Simulación
      </a>
      <a href="#grafico-casas" onClick={(e) => {
        e.preventDefault();
        setSection("grafico-casas")
      }}>
        Gráfico de casas
      </a>
      <a href="#adherentes" onClick={(e) => {
        e.preventDefault();
        setSection("adherentes")
      }}>
        Adherentes
      </a>
      <a href="#pagos" onClick={(e) => {
        e.preventDefault();
        setSection("pagos")
      }}>
        Pagos
      </a>
    </nav>
  );
}

export default Navbar;
