// Esqueleto para gráfico de casas iniciadas con Chart.js
let chartCasas = null;

export function renderChartCasasIniciadas(points) {
  const container = document.getElementById('casasChartCanvas').parentElement;
  if (!points || points.length === 0) {
    if (container) container.style.display = 'none';
    if (chartCasas) { chartCasas.destroy(); chartCasas = null; }
    return;
  }
  if (container) container.style.display = '';
  const ctx = document.getElementById('casasChartCanvas').getContext('2d');
  if (chartCasas) chartCasas.destroy();
  const labels = points.map(p => `Año ${p.ano}`);
  const data = points.map(p => p.casasAno);
  chartCasas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Casas iniciadas',
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
        y: { title: { display: true, text: 'Casas iniciadas' }, beginAtZero: true }
      }
    }
  });
}
