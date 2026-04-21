function Navbar() {

  return (
    <nav className="section-nav" aria-label="Navegación de secciones">
      <a id="nav-link-admin" href="#admin-panel">Admin</a>
      <a href="#simulaciones-guardadas">Simulaciones guardadas</a>
      <a href="#configuracion">Configuración + Estado</a>
      <a href="#simulacion">Simulación</a>
      <a href="#grafico-casas">Gráfico de casas</a>
      <a href="#adherentes">Adherentes</a>
      <a href="#pagos">Pagos</a>
    </nav>
  );
}

export default Navbar;
