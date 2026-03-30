// Chart.js: Casas en ejecución por año (copia migrada)
let chartCasasEjecucion = null;

import { buildCasasEjecucionAnoData } from "./modules/renderers.js";

export function renderChartCasasEjecucionChartJS(rows) {
  const points = buildCasasEjecucionAnoData(rows).filter(p => p.ano > 0);
  const container = document.getElementById('casas-ejecucion-chart')?.parentElement;
  if (!points || points.length === 0) {
    if (container) container.style.display = 'none';
    if (chartCasasEjecucion) { chartCasasEjecucion.destroy(); chartCasasEjecucion = null; }
    return;
  }
  if (container) container.style.display = '';
  const ctx = document.getElementById('casas-ejecucion-chart').getContext('2d');
  if (chartCasasEjecucion) chartCasasEjecucion.destroy();
  const labels = points.map(p => `Año ${p.ano}`);
  const data = points.map(p => p.casasAno);
  chartCasasEjecucion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Casas en ejecución',
        data: data,
        backgroundColor: 'rgba(0, 109, 91, 0.38)',
        borderColor: 'rgba(0, 109, 91, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true }
      },
      scales: {
        x: { title: { display: true, text: 'Año' } },
        y: { title: { display: true, text: 'Casas en ejecución' }, beginAtZero: true }
      }
    }
  });
}
