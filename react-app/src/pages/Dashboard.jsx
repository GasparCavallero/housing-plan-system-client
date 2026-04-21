import Header from "../components/Header";
import Navbar from "../components/Navbar";

import AdminPanel from "../sections/AdminPanel";
import Simulaciones from "../sections/Simulaciones";
import Configuracion from "../sections/Configuracion";
import Simulacion from "../sections/Simulacion";
import Adherentes from "../sections/Adherentes";
import Pagos from "../sections/Pagos";

function Dashboard() {
  return (
    <div>
      <div className="bg-shape bg-shape-a"></div>
      <div className="bg-shape bg-shape-b"></div>

      <Header />
      <Navbar />

      <main className="layout">
        {<AdminPanel />}
        <Simulaciones />
        <Configuracion />
        <Simulacion />
        <Adherentes />
        <Pagos />
      </main>
    </div>
  );
}

export default Dashboard;