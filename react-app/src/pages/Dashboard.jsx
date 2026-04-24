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

  const [simulacionRows, setSimulacionRows] = useState([]);

  const handleRowsChange = (rows) => {
    setSimulacionRows(rows);
  };
  const [valorViviendaArs, setValorViviendaArs] = useState(0);
  console.log("Dashboard render - simulacionRows:", simulacionRows?.length, "section:", section);

  return (
    <div>
      <div className="bg-shape bg-shape-a"></div>
      <div className="bg-shape bg-shape-b"></div>

      <Header user={user} />
      <Navbar section={section} user={user} setSection={setSection} />

      <main className="layout">
        {section === "admin" && isAdmin && <AdminPanel />}
        {section === "simulaciones" && <Simulaciones />}
        {section === "configuracion" && <Configuracion onValorViviendaChange={setValorViviendaArs} />}
        {section === "simulacion" && <Simulacion onRowsChange={handleRowsChange} />}
        {section === "graficos" && (
          <GraficosCasas rows={simulacionRows} valorViviendaArs={valorViviendaArs} />
        )}
        {section === "adherentes" && <Adherentes />}
        {section === "pagos" && <Pagos />}
      </main>
    </div>
  );
}

export default Dashboard;