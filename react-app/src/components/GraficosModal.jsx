import { useEffect, useRef, useState } from "react";
import {
  Chart, BarController, LineController, BarElement, LineElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend
} from "chart.js";
import {
  buildCasasIniciadasData,
  buildCasasTerminadasData,
  buildRecaudacionData
} from "../utils/chartBuilders.js";

Chart.register(BarController, LineController, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const GREEN_BG = "rgba(0, 109, 91, 0.38)";
const GREEN_BORDER = "rgba(0, 109, 91, 1)";

const TABS = [
  { id: "iniciadas", label: "Casas iniciadas" },
  { id: "terminadas", label: "Casas terminadas" },
  { id: "ejecucion", label: "En ejecución" },
  { id: "recaudacion", label: "Recaudación" },
];

function sumPoints(points) {
  return points.reduce((acc, p) => acc + p.val, 0);
}

function useBarChart(canvasRef, points, config) {
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (instanceRef.current) { instanceRef.current.destroy(); instanceRef.current = null; }
    if (!points || points.length === 0) return;

    // pequeño timeout para que el canvas esté visible y tenga dimensiones
    const id = setTimeout(() => {
      if (!canvasRef.current) return;
      instanceRef.current = new Chart(canvasRef.current, config(points));
    }, 30);

    return () => {
      clearTimeout(id);
      if (instanceRef.current) { instanceRef.current.destroy(); instanceRef.current = null; }
    };
  }, [points]); // eslint-disable-line react-hooks/exhaustive-deps
}

function barConfig(points, label, yLabel) {
  return {
    type: "bar",
    data: {
      labels: points.map((p) => `Año ${p.ano}`),
      datasets: [{
        label,
        data: points.map((p) => p.val),
        backgroundColor: GREEN_BG,
        borderColor: GREEN_BORDER,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true }, tooltip: { enabled: true } },
      scales: {
        x: { title: { display: true, text: "Año" } },
        y: { title: { display: true, text: yLabel }, beginAtZero: true },
      },
    },
  };
}

// ── Paneles individuales ──────────────────────────────────────────────────────

function TabIniciadas({ rows }) {
  const ref = useRef(null);
  const points = buildCasasIniciadasData(rows);
  const total = sumPoints(points);
  useBarChart(ref, points, (p) => barConfig(p, "Casas iniciadas", "Cantidad de casas"));
  return points.length === 0
    ? <p className="config-help">Sin datos de casas iniciadas.</p>
    : (
      <>
        <p className="chart-total">Total casas iniciadas: <strong>{total}</strong></p>
        <canvas ref={ref} />
      </>
    );
}

function TabTerminadas({ rows }) {
  const ref = useRef(null);
  const points = buildCasasTerminadasData(rows);
  const total = sumPoints(points);
  useBarChart(ref, points, (p) => barConfig(p, "Casas terminadas", "Casas terminadas"));
  return points.length === 0
    ? <p className="config-help">Sin datos de casas terminadas.</p>
    : (
      <>
        <p className="chart-total">Total casas terminadas: <strong>{total}</strong></p>
        <canvas ref={ref} />
      </>
    );
}

function TabEjecucion({ rows }) {
  const ref = useRef(null);
  const points = buildCasasIniciadasData(rows);
  const total = sumPoints(points);
  useBarChart(ref, points, (p) => barConfig(p, "Casas en ejecución", "Casas en ejecución"));
  return points.length === 0
    ? <p className="config-help">Sin datos de casas en ejecución.</p>
    : (
      <>
        <p className="chart-total">Total casas en ejecución: <strong>{total}</strong></p>
        <canvas ref={ref} />
      </>
    );
}

function TabRecaudacion({ rows, valorViviendaArs }) {
  const ref = useRef(null);
  const valorEfectivo = valorViviendaArs > 0
    ? valorViviendaArs
    : (() => {
      const row = rows?.find((r) => Number(r?.cuotaCompletaMes) > 0);
      return row ? Number(row.cuotaCompletaMes) / 0.00833333 : 0;
    })();

  const points = buildRecaudacionData(rows, valorEfectivo);
  const totalRecaudado = points.reduce((acc, p) => acc + p.val, 0);
  const totalCasas = points.reduce((acc, p) => acc + p.casasAlcanzables, 0);

  useEffect(() => {
    if (!ref.current || points.length === 0) return;
    let instance = null;
    const id = setTimeout(() => {
      if (!ref.current) return;
      instance = new Chart(ref.current, {
        type: "bar",
        data: {
          labels: points.map((p) => `Año ${p.ano}`),
          datasets: [
            {
              label: "Recaudación (ARS)",
              data: points.map((p) => p.val),
              backgroundColor: GREEN_BG,
              borderColor: GREEN_BORDER,
              borderWidth: 1,
            },
            {
              label: "Casas alcanzables",
              data: points.map((p) => p.casasAlcanzables),
              type: "line",
              fill: false,
              borderColor: "#d46f2a",
              borderWidth: 2,
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true }, tooltip: { enabled: true } },
          scales: {
            x: { title: { display: true, text: "Año" } },
            y: { title: { display: true, text: "Recaudación (ARS) / Casas" }, beginAtZero: true },
          },
        },
      });
    }, 30);

    return () => {
      clearTimeout(id);
      if (instance) instance.destroy();
    };
  }, [points]);

  return points.length === 0
    ? <p className="config-help">Sin datos de recaudación.</p>
    : (
      <>
        <p className="chart-total">
          Total recaudado: <strong>{totalRecaudado.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}</strong>
          {" · "}
          Casas alcanzables totales: <strong>{totalCasas.toLocaleString("es-AR", { maximumFractionDigits: 1 })}</strong>
        </p>
        <canvas ref={ref} />
      </>
    );
}

// ── Modal principal ───────────────────────────────────────────────────────────

function GraficosModal({ rows, valorViviendaArs, onClose }) {
  const [activeTab, setActiveTab] = useState("iniciadas");

  // cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-graficos" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gráficos de simulación</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <nav className="modal-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`modal-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="modal-chart-area">
          {activeTab === "iniciadas" && <TabIniciadas rows={rows} />}
          {activeTab === "terminadas" && <TabTerminadas rows={rows} />}
          {activeTab === "ejecucion" && <TabEjecucion rows={rows} />}
          {activeTab === "recaudacion" && <TabRecaudacion rows={rows} valorViviendaArs={valorViviendaArs} />}
        </div>
      </div>
    </div>
  );
}

export default GraficosModal;