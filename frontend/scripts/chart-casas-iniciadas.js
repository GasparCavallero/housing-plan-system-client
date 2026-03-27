// Chart.js: Casas iniciadas por año
let casasChartInstance = null;

export function buildCasasAnoData(rows) {
  const data = {};
  rows.forEach(r => {
    const year = Math.floor((r.mes - 1) / 12) + 1;
    data[year] = (data[year] || 0) + (r.casasIniciadasMes || 0);
  });
  return {
    labels: Object.keys(data),
    values: Object.values(data)
  };
}

export function renderCasasChart(rows) {
  const { labels, values } = buildCasasAnoData(rows);
  const ctx = document.getElementById('casasChart');
  if (!ctx) return;
  if (casasChartInstance) casasChartInstance.destroy();
  casasChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Casas iniciadas por año',
        data: values,
        backgroundColor: '#4f46e5'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: { title: { display: true, text: 'Año' } },
        y: { beginAtZero: true, title: { display: true, text: 'Cantidad de casas' } }
      }
    }
  });
}
