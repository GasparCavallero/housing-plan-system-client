import { useState, useEffect } from 'react';
import ChartPanel from '../components/ChartPanel.jsx';
// Importa tus funciones de procesamiento si ya las tenés, o usalas desde props
import { buildCasasEjecucionAnoData } from "../utils/chartUtils.js"; 

function GraficosCasas({ simulationRows }) {
  const [dataEjecucion, setDataEjecucion] = useState([]);

  useEffect(() => {
    if (simulationRows && simulationRows.length > 0) {
      // Mapeamos los puntos para que el componente genérico los entienda
      const points = buildCasasEjecucionAnoData(simulationRows)
        .filter(p => p.ano > 0)
        .map(p => ({ ano: p.ano, valor: p.casasAno }));
      
      setDataEjecucion(points);
    }
  }, [simulationRows]);

  return (
    <section id="grafico-casas" className="panel panel-chart">
      {/* Gráfico 1: Ejecución */}
      <ChartPanel 
        title="Casas en ejecución por año"
        summary={dataEjecucion.length > 0 ? "Evolución anual de obras" : "Ejecutá una simulación para visualizar."}
        label="Casas en ejecución"
        data={dataEjecucion}
      />

      {/* Gráfico 2: Terminadas (Ejemplo de cómo añadir otro fácilmente) */}
      <ChartPanel 
        title="Casas terminadas por año"
        summary="Visualización de finales de obra."
        label="Casas terminadas"
        data={[]} // Aquí pasarías los datos correspondientes
        color="rgba(54, 162, 235, 0.38)"
        borderColor="rgba(54, 162, 235, 1)"
      />
      
      {/* Repetir para los otros gráficos... */}
    </section>
  );
}

export default GraficosCasas;