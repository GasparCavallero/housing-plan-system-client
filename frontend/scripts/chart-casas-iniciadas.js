// Chart.js: Casas iniciadas por año
let casasChartInstance = null;

// Copiado y adaptado de modules/renderers.js para asegurar consistencia
export function buildCasasAnoData(rows) {
  const pointsByYear = {};
  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) {
      return;
    }
    const ano = Math.floor(mes / 12) + 1;
    const direct = Number(
      row?.casasIniciadasMes
      ?? row?.casas_iniciadas_mes
      ?? row?.viviendas_iniciadas_mes
      ?? row?.casas_mes
      ?? row?.inicios_mes
    );
    const cumulative = Number(
      row?.casasIniciadasAcumuladas
      ?? row?.casas_iniciadas
      ?? row?.viviendas_iniciadas
    );
    let casasAno = 0;
    if (Number.isFinite(direct)) {
      casasAno = Math.max(0, direct);
    } else if (Number.isFinite(cumulative)) {
      casasAno = Number.isFinite(cumulative) ? Math.max(0, cumulative) : 0;
    } else {
      casasAno = 0; // No contamos eventos en Chart.js
    }
    pointsByYear[ano] = (pointsByYear[ano] ?? 0) + casasAno;
  });
  // Filtrar año 0
  const points = Object.entries(pointsByYear)
    .map(([ano, casasAno]) => ({ ano: Number(ano), casasAno }))
    .filter(p => p.ano > 0)
    .sort((a, b) => a.ano - b.ano);
  return {
    labels: points.map(p => p.ano),
    values: points.map(p => p.casasAno)
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
