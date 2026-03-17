const form = document.getElementById("config-form");
const buttonSimular = document.getElementById("btn-simular");
const tableBody = document.getElementById("sim-table-body");
const simSummary = document.getElementById("sim-summary");

const kpi = {
  valorViviendaArs: document.getElementById("kpi-valor-vivienda-ars"),
  valorViviendaUsd: document.getElementById("kpi-valor-vivienda-usd"),
  fondoArs: document.getElementById("kpi-fondo-ars"),
  fondoUsd: document.getElementById("kpi-fondo-usd"),
  viviendasIniciadas: document.getElementById("kpi-viviendas-iniciadas"),
  viviendasFinalizadas: document.getElementById("kpi-viviendas-finalizadas"),
  ingresoMensual: document.getElementById("kpi-ingreso-mensual")
};

const formatterArs = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const formatterUsd = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

function getConfig() {
  const data = new FormData(form);

  return {
    cantidadCuotas: Number(data.get("cantidadCuotas")),
    cantidadAdherentes: Number(data.get("cantidadAdherentes")),
    metrosCuadrados: Number(data.get("metrosCuadrados")),
    valorPorM2: Number(data.get("valorPorM2")),
    duracionConstruccionMeses: Number(data.get("duracionConstruccionMeses")),
    tipoCambio: Number(data.get("tipoCambio")),
    mediaCuota: Number(data.get("mediaCuota")),
    cuotaCompleta: Number(data.get("cuotaCompleta"))
  };
}

function valorVivienda(config) {
  return config.metrosCuadrados * config.valorPorM2;
}

function toUsd(ars, tipoCambio) {
  if (!tipoCambio || tipoCambio <= 0) {
    return 0;
  }

  return ars / tipoCambio;
}

function simularPlan(config, meses = 36) {
  const viviendaArs = valorVivienda(config);
  let fondo = 0;
  let activos = config.cantidadAdherentes;
  let adjudicados = 0;
  let iniciadas = 0;
  let finalizadas = 0;
  const obras = [];
  const timeline = [];

  for (let mes = 1; mes <= meses; mes += 1) {
    const terminadasEsteMes = obras.filter((obra) => obra.finMes === mes).length;
    if (terminadasEsteMes > 0) {
      finalizadas += terminadasEsteMes;
      adjudicados += terminadasEsteMes;
    }

    const ingresoMes = (activos * config.mediaCuota) + (adjudicados * config.cuotaCompleta);
    fondo += ingresoMes;

    let evento = "-";

    if (activos > 0 && fondo >= viviendaArs) {
      fondo -= viviendaArs;
      iniciadas += 1;
      activos -= 1;
      obras.push({ finMes: mes + config.duracionConstruccionMeses });
      evento = `Inicio casa ${iniciadas}`;
    }

    if (terminadasEsteMes > 0) {
      evento = evento === "-"
        ? `Finaliza ${terminadasEsteMes} vivienda(s)`
        : `${evento} / Finaliza ${terminadasEsteMes}`;
    }

    timeline.push({
      mes,
      activos,
      enConstruccion: obras.filter((obra) => obra.finMes > mes).length,
      adjudicados,
      ingresoMes,
      fondo,
      evento
    });
  }

  return {
    timeline,
    viviendaArs,
    fondoFinal: fondo,
    iniciadas,
    finalizadas,
    ingresoActual: (activos * config.mediaCuota) + (adjudicados * config.cuotaCompleta)
  };
}

function updateKpi(config, result) {
  kpi.valorViviendaArs.textContent = formatterArs.format(result.viviendaArs);
  kpi.valorViviendaUsd.textContent = formatterUsd.format(toUsd(result.viviendaArs, config.tipoCambio));

  kpi.fondoArs.textContent = formatterArs.format(result.fondoFinal);
  kpi.fondoUsd.textContent = formatterUsd.format(toUsd(result.fondoFinal, config.tipoCambio));

  kpi.viviendasIniciadas.textContent = String(result.iniciadas);
  kpi.viviendasFinalizadas.textContent = `Finalizadas: ${result.finalizadas}`;
  kpi.ingresoMensual.textContent = formatterArs.format(result.ingresoActual);
}

function renderTable(rows) {
  tableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.mes}</td>
      <td>${row.activos}</td>
      <td>${row.enConstruccion}</td>
      <td>${row.adjudicados}</td>
      <td>${formatterArs.format(row.ingresoMes)}</td>
      <td>${formatterArs.format(row.fondo)}</td>
      <td class="evento">${row.evento}</td>
    </tr>
  `).join("");
}

function ejecutarSimulacion() {
  const config = getConfig();
  const result = simularPlan(config, 36);

  updateKpi(config, result);
  renderTable(result.timeline);

  const primerasCasas = result.timeline
    .filter((m) => m.evento.includes("Inicio casa"))
    .slice(0, 3)
    .map((m) => `Casa ${m.evento.split(" ").at(-1)} -> mes ${m.mes}`);

  simSummary.textContent = primerasCasas.length > 0
    ? `Proyección inicial: ${primerasCasas.join(" | ")}`
    : "No se logra iniciar ninguna vivienda con los parámetros actuales.";
}

buttonSimular.addEventListener("click", ejecutarSimulacion);

ejecutarSimulacion();
