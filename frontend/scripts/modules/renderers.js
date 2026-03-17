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

export function renderTimeline(tableBody, rows) {
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

export function renderAdherentes(tableBody, summaryTarget, items) {
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
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.timeline)) {
    return payload.timeline;
  }
  if (Array.isArray(payload.meses)) {
    return payload.meses;
  }
  if (Array.isArray(payload.resultados)) {
    return payload.resultados;
  }
  return [];
}
