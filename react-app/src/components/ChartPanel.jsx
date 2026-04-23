import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registramos los componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ChartPanel({ title, summary, data, label, color = 'rgba(0, 109, 91, 0.38)', borderColor = 'rgba(0, 109, 91, 1)' }) {
  const chartData = {
    labels: data.map(p => `Año ${p.ano}`),
    datasets: [
      {
        label: label,
        data: data.map(p => p.valor),
        backgroundColor: color,
        borderColor: borderColor,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <>
      <div className="panel-head">
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      <div className="main-chart-canvas" style={{ height: '300px', position: 'relative' }}>
        {data.length > 0 ? (
          <Bar data={chartData} options={options} />
        ) : (
          <div className="chart-placeholder">Sin datos de simulación</div>
        )}
      </div>
    </>
  );
}

export default ChartPanel;