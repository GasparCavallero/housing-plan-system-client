// Chart.js: Recaudación y casas alcanzables por año (copia migrada)
let chartRecaudacion = null;

import { buildRecaudacionCasasAnoData } from "./modules/renderers.js";

export function renderChartRecaudacionChartJS(rows, valorViviendaArs) {
  const points = buildRecaudacionCasasAnoData(rows, valorViviendaArs).filter(p => p.ano > 0);
  const container = document.getElementById('recaudacion-chart')?.parentElement;
  if (!points || points.length === 0) {
    if (container) container.style.display = 'none';
    if (chartRecaudacion) { chartRecaudacion.destroy(); chartRecaudacion = null; }
    return;
  }
  if (container) container.style.display = '';
  const ctx = document.getElementById('recaudacion-chart').getContext('2d');
  if (chartRecaudacion) chartRecaudacion.destroy();
  const labels = points.map(p => `Año ${p.ano}`);
  const dataRecaudado = points.map(p => p.recaudadoArs);
  const dataCasas = points.map(p => p.casasAlcanzables);
  chartRecaudacion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Recaudación (ARS)',
          data: dataRecaudado,
          backgroundColor: 'rgba(0, 109, 91, 0.38)',
          borderColor: 'rgba(0, 109, 91, 1)',
          borderWidth: 1
        },
        {
          label: 'Casas alcanzables',
          data: dataCasas,
          type: 'line',
          fill: false,
          borderColor: '#d46f2a',
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true }
      },
      scales: {
        x: { title: { display: true, text: 'Año' } },
        y: { title: { display: true, text: 'Recaudación (ARS) / Casas' }, beginAtZero: true }
      }
    }
  });
}
