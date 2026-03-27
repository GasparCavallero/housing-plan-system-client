// Chart.js: Casas terminadas por año (copia migrada)
let chartCasasTerminadas = null;

export function renderChartCasasTerminadasChartJS(points) {
  const container = document.getElementById('casasFinishChartCanvas').parentElement;
  if (!points || points.length === 0) {
    if (container) container.style.display = 'none';
    if (chartCasasTerminadas) { chartCasasTerminadas.destroy(); chartCasasTerminadas = null; }
    return;
  }
  if (container) container.style.display = '';
  const ctx = document.getElementById('casasFinishChartCanvas').getContext('2d');
  if (chartCasasTerminadas) chartCasasTerminadas.destroy();
  const labels = points.map(p => `Año ${p.ano}`);
  const data = points.map(p => p.casasAno);
  chartCasasTerminadas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Casas terminadas',
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
        y: { title: { display: true, text: 'Casas terminadas' }, beginAtZero: true }
      }
    }
  });
}
