import { formatterArs, formatterUsd } from "./formatters.js";
import { toUsd } from "./simulation.js";

export function writeLog(target, title, payload) {
  const safe = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  target.textContent = `${title}\n${safe}`;
}

export function setSummary(target, text) {
  target.textContent = text;
}

export function updateKpi(kpi, config, result) {
  kpi.valorViviendaArs.textContent = formatterArs.format(result.viviendaArs);
  kpi.valorViviendaUsd.textContent = formatterUsd.format(toUsd(result.viviendaArs, config.tipo_cambio));

  kpi.fondoArs.textContent = formatterArs.format(result.fondoFinal);
  kpi.fondoUsd.textContent = formatterUsd.format(toUsd(result.fondoFinal, config.tipo_cambio));

  kpi.viviendasIniciadas.textContent = String(result.iniciadas);
  kpi.viviendasFinalizadas.textContent = `Finalizadas: ${result.finalizadas}`;
  kpi.ingresoMensual.textContent = formatterArs.format(result.ingresoActual);
}

export function updateKpiFromResumen(kpi, resumen, estadoPlan = null) {
  kpi.valorViviendaArs.textContent = formatterArs.format(resumen.valor_vivienda_ars);
  kpi.valorViviendaUsd.textContent = formatterUsd.format(resumen.valor_vivienda_usd);
  kpi.fondoArs.textContent = formatterArs.format(resumen.fondo_ars);
  kpi.fondoUsd.textContent = formatterUsd.format(resumen.fondo_usd);
  kpi.ingresoMensual.textContent = formatterArs.format(resumen.ingreso_mensual_ars);

  if (estadoPlan) {
    kpi.viviendasIniciadas.textContent = String(estadoPlan.casas_iniciadas ?? 0);
    kpi.viviendasFinalizadas.textContent = `Finalizadas: ${estadoPlan.casas_entregadas ?? 0}`;
  }
}

export function renderTimeline(tableBody, rows) {
  const fullHeader = `
    <th>Mes</th>
    <th>Activos</th>
    <th>En construcción</th>
    <th>Adjudicados</th>
    <th>Ingreso mes</th>
    <th>Fondo cierre</th>
    <th>Evento</th>
  `;

  const eventsOnlyHeader = `
    <th>Mes</th>
    <th>Evento</th>
  `;

  const hasMetrics = (row) => {
    const metricKeys = [
      "activos",
      "adherentes_activos",
      "enConstruccion",
      "adherentes_en_construccion",
      "adjudicados",
      "adherentes_adjudicados",
      "ingresoMes",
      "ingreso_mes",
      "fondo",
      "fondo_cierre"
    ];
    return metricKeys.some((key) => row?.[key] !== null && row?.[key] !== undefined);
  };

  const soloEventos = rows.length > 0 && rows.every((row) => !hasMetrics(row));
  const headerRow = tableBody.closest("table")?.querySelector("thead tr");

  if (headerRow) {
    headerRow.innerHTML = soloEventos ? eventsOnlyHeader : fullHeader;
  }

  if (soloEventos) {
    tableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.mes ?? "-"}</td>
        <td class="evento">${row.evento || row.evento_mes || "-"}</td>
      </tr>
    `).join("");
    return;
  }

  tableBody.innerHTML = rows.map((row) => `
    <tr>
      <td>${row.mes ?? "-"}</td>
      <td>${row.activos ?? row.adherentes_activos ?? "-"}</td>
      <td>${row.enConstruccion ?? row.adherentes_en_construccion ?? "-"}</td>
      <td>${row.adjudicados ?? row.adherentes_adjudicados ?? "-"}</td>
      <td>${typeof row.ingresoMes === "number" ? formatterArs.format(row.ingresoMes) : (typeof row.ingreso_mes === "number" ? formatterArs.format(row.ingreso_mes) : "-")}</td>
      <td>${typeof row.fondo === "number" ? formatterArs.format(row.fondo) : (typeof row.fondo_cierre === "number" ? formatterArs.format(row.fondo_cierre) : "-")}</td>
      <td class="evento">${row.evento || row.evento_mes || "-"}</td>
    </tr>
  `).join("");
}

export function hasTimelineMetrics(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return false;
  }

  return rows.some((row) => {
    const metricKeys = [
      "activos",
      "adherentes_activos",
      "enConstruccion",
      "adherentes_en_construccion",
      "adjudicados",
      "adherentes_adjudicados",
      "ingresoMes",
      "ingreso_mes",
      "fondo",
      "fondo_cierre"
    ];
    return metricKeys.some((key) => row?.[key] !== null && row?.[key] !== undefined);
  });
}

export function renderAdherentes(tableBody, summaryTarget, items) {
  if (!Array.isArray(items) || items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No hay adherentes para este usuario.</td>
      </tr>
    `;
    summaryTarget.textContent = "Total: 0";
    return;
  }

  tableBody.innerHTML = items.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.nombre}</td>
      <td>${item.estado}</td>
      <td>${item.cuotas_pagadas}</td>
      <td>${item.cuotas_bonificadas_por_licitacion}</td>
    </tr>
  `).join("");
  summaryTarget.textContent = `Total: ${items.length}`;
}

export function renderPagos(tableBody, summaryTarget, items) {
  if (!Array.isArray(items) || items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No hay pagos para este usuario.</td>
      </tr>
    `;
    summaryTarget.textContent = "Total: 0";
    return;
  }

  tableBody.innerHTML = items.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.adherente_id}</td>
      <td>${formatterArs.format(item.monto_ars)}</td>
      <td>${item.mes}</td>
      <td>${new Date(item.fecha).toLocaleString("es-AR")}</td>
    </tr>
  `).join("");
  summaryTarget.textContent = `Total: ${items.length}`;
}

export function normalizeTimeline(payload) {
  const mapRow = (row) => {
    if (!row || typeof row !== "object") {
      return null;
    }

    const mes = row.mes ?? row.mes_inicio ?? row.periodo ?? row.periodo_mes ?? null;
    const activos = row.activos ?? row.adherentes_activos ?? row.cantidad_activos ?? null;
    const enConstruccion = row.enConstruccion ?? row.en_construccion ?? row.adherentes_en_construccion ?? null;
    const adjudicados = row.adjudicados ?? row.adherentes_adjudicados ?? row.casas_adjudicadas ?? null;
    const ingresoMes = row.ingresoMes ?? row.ingreso_mes ?? row.ingreso_mes_ars ?? row.ingreso_mensual_ars ?? null;
    const fondo = row.fondo ?? row.fondo_cierre ?? row.fondo_ars ?? row.fondo_final_ars ?? null;

    let evento = row.evento ?? row.evento_mes ?? row.descripcion ?? row.detalle ?? null;
    if (!evento && row.casa_numero != null && mes != null) {
      evento = `Inicio casa ${row.casa_numero}`;
    }

    return { mes, activos, enConstruccion, adjudicados, ingresoMes, fondo, evento };
  };

  const pickArray = (input) => {
    if (!input || typeof input !== "object") {
      return null;
    }

    const candidateKeys = [
      "timeline",
      "meses",
      "resultados",
      "eventos",
      "simulacion",
      "simulacion_mensual",
      "detalle",
      "data",
      "items"
    ];

    for (const key of candidateKeys) {
      if (Array.isArray(input[key])) {
        return input[key];
      }
    }

    for (const value of Object.values(input)) {
      if (Array.isArray(value)) {
        return value;
      }
      if (value && typeof value === "object") {
        const nested = pickArray(value);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  };

  const rows = Array.isArray(payload) ? payload : pickArray(payload) || [];

  return rows
    .map(mapRow)
    .filter((row) => row && Object.values(row).some((value) => value !== null && value !== undefined));
}
