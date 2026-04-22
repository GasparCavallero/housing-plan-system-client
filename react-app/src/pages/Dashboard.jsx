import { useState } from "react";
import Header from "../components/Header";
import Navbar from "../components/Navbar";

import AdminPanel from "../sections/AdminPanel";
import Simulaciones from "../sections/Simulaciones";
import Configuracion from "../sections/Configuracion";
import Simulacion from "../sections/Simulacion";
import Adherentes from "../sections/Adherentes";
import Pagos from "../sections/Pagos";

function Dashboard({ user }) {
  const [section, setSection] = useState("simulaciones");
  const isAdmin = user?.role === "admin";

  return (
    <div>
      <div className="bg-shape bg-shape-a"></div>
      <div className="bg-shape bg-shape-b"></div>

      <Header user={user} />
      <Navbar user={user} setSection={setSection} />

      <main className="layout">
        {section === "admin" && isAdmin && <AdminPanel />}
        {section === "simulaciones" && <Simulaciones />}
        {section === "configuracion" && <Configuracion />}
        {section === "simulacion" && <Simulacion />}
        {section === "adherentes" && <Adherentes />}
        {section === "pagos" && <Pagos />}
      </main>
    </div>
  );
}

export default Dashboard;