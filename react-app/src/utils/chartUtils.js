function countStartsFromEvent(eventText) {
  if (!eventText) return 0;
  const normalized = String(eventText);
  const matches = normalized.match(/inicio casa/gi);
  return matches ? matches.length : 0;
}

function countFinishesFromEvent(eventText) {
  if (!eventText) return 0;
  const normalized = String(eventText);
  const matches = normalized.match(/entrega casa|casa entregada|finaliza casa|casa finalizada/gi);
  return matches ? matches.length : 0;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

// --- PROCESAMIENTO DE DATOS PARA GRÁFICOS ---

export function buildCasasAnoData(rows) {
  const pointsByYear = {};

  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) return;

    const ano = Math.floor(mes / 12) + 1;
    const direct = Number(
      row?.casasIniciadasMes ?? 
      row?.casas_iniciadas_mes ?? 
      row?.viviendas_iniciadas_mes ?? 
      row?.casas_mes ?? 
      row?.inicios_mes
    );

    const cumulative = Number(
      row?.casasIniciadasAcumuladas ?? 
      row?.casas_iniciadas ?? 
      row?.viviendas_iniciadas
    );

    let casasAno = 0;
    if (Number.isFinite(direct)) {
      casasAno = Math.max(0, direct);
    } else if (Number.isFinite(cumulative)) {
      casasAno = Math.max(0, cumulative);
    } else {
      casasAno = countStartsFromEvent(row?.evento ?? row?.evento_mes);
    }

    pointsByYear[ano] = (pointsByYear[ano] ?? 0) + casasAno;
  });

  return Object.entries(pointsByYear)
    .map(([ano, casasAno]) => ({ ano: Number(ano), valor: casasAno })) // Usamos 'valor' como nombre genérico
    .sort((a, b) => a.ano - b.ano);
}

export function buildCasasTerminadasAnoData(rows) {
  const pointsByYear = {};

  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) return;

    const ano = Math.floor(mes / 12) + 1;
    const direct = Number(
      row?.casasTerminadasMes ?? 
      row?.casas_terminadas_mes ?? 
      row?.viviendas_terminadas_mes ?? 
      row?.casas_finalizadas_mes ?? 
      row?.entregadas_mes
    );

    const cumulative = Number(
      row?.casasTerminadasAcumuladas ?? 
      row?.casas_entregadas ?? 
      row?.viviendas_entregadas ?? 
      row?.casas_terminadas
    );

    let casasAno = 0;
    if (Number.isFinite(direct)) {
      casasAno = Math.max(0, direct);
    } else if (Number.isFinite(cumulative)) {
      casasAno = Math.max(0, cumulative);
    } else {
      casasAno = countFinishesFromEvent(row?.evento ?? row?.evento_mes);
    }

    pointsByYear[ano] = (pointsByYear[ano] ?? 0) + casasAno;
  });

  return Object.entries(pointsByYear)
    .map(([ano, casasAno]) => ({ ano: Number(ano), valor: casasAno }))
    .sort((a, b) => a.ano - b.ano);
}

export function buildRecaudacionCasasAnoData(rows, valorViviendaArs) {
  const pointsByYear = {};

  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) return;

    const ano = Math.floor(mes / 12) + 1;
    const ingresoMes = Number(row?.ingresoMes ?? row?.ingreso_mes_ars);
    const ingresoSeguro = Number.isFinite(ingresoMes) && ingresoMes > 0 ? ingresoMes : 0;

    pointsByYear[ano] = roundMoney((pointsByYear[ano] ?? 0) + ingresoSeguro);
  });

  return Object.entries(pointsByYear)
    .map(([ano, recaudadoArs]) => {
      const casasAlcanzables = Number.isFinite(valorViviendaArs) && valorViviendaArs > 0
        ? Number((recaudadoArs / valorViviendaArs).toFixed(2))
        : 0;
      return {
        ano: Number(ano),
        valor: recaudadoArs, // Esto es para la barra
        extra: casasAlcanzables // Esto podrías usarlo para un segundo eje o tooltip
      };
    })
    .sort((a, b) => a.ano - b.ano);
}