function Navbar({ section, setSection, user }) {
  const isAdmin = user?.role === "admin";

  const handleClick = (e, sec) => {
    e.preventDefault();
    setSection(sec);
  };

  const getProps = (sec) => ({
    className: section === sec ? "is-active" : "",
    "aria-current": section === sec ? "true" : undefined,
    onClick: (e) => handleClick(e, sec),
  });

  return (
    <nav className="section-nav" aria-label="Navegación de secciones">
      {isAdmin && (
        <a id="nav-link-admin" 
        href="#admin-panel" 
        {...getProps("admin")}
        >
          Admin
        </a>
      )}
      <a href="#simulaciones-guardadas" {...getProps("simulaciones")}>
        Simulaciones guardadas
      </a>
      <a href="#configuracion" {...getProps("configuracion")}>
        Configuración + Estado
      </a>
      <a href="#simulacion" {...getProps("simulacion")}>
        Simulación
      </a>
      <a href="#adherentes" {...getProps("adherentes")}>
        Adherentes
      </a>
      <a href="#pagos" {...getProps("pagos")}>
        Pagos
      </a>
    </nav>
  );
}

export default Navbar;