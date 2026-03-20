import { formatterArs, formatterUsd } from "./formatters.js";
import { toUsd } from "./simulation.js";

export function writeLog(target, title, payload) {
  const safe = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  target.textContent = `${title}\n${safe}`;
}

export function setSummary(target, text) {
  target.textContent = text;
}

function countStartsFromEvent(eventText) {
  if (!eventText) {
    return 0;
  }
  const normalized = String(eventText);
  const matches = normalized.match(/inicio casa/gi);
  return matches ? matches.length : 0;
}

export function buildCasasMesData(rows) {
  const points = [];
  let previousCumulative = null;

  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) {
      return;
    }

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

    let casasMes = 0;
    if (Number.isFinite(direct)) {
      casasMes = Math.max(0, direct);
    } else if (Number.isFinite(cumulative)) {
      if (previousCumulative === null) {
        casasMes = Math.max(0, cumulative);
      } else {
        casasMes = Math.max(0, cumulative - previousCumulative);
      }
    } else {
      casasMes = countStartsFromEvent(row?.evento ?? row?.evento_mes);
    }

    if (Number.isFinite(cumulative)) {
      previousCumulative = cumulative;
    }

    points.push({ mes, casasMes });
  });

  return points.sort((a, b) => a.mes - b.mes);
}

export function renderCasasChart(target, summaryTarget, rows) {
  const points = buildCasasMesData(rows);
  if (!Array.isArray(points) || points.length === 0) {
    target.innerHTML = "Sin datos de simulación para graficar.";
    summaryTarget.textContent = "Ejecutá una simulación para visualizar la evolución mensual.";
    target.classList.add("casas-chart-empty");
    return;
  }

  target.classList.remove("casas-chart-empty");
  target.innerHTML = `
    <div class="casas-chart-shell">
      <svg viewBox="0 0 900 240" role="img" aria-label="Casas iniciadas por mes"></svg>
      <div class="casas-chart-tooltip hidden"></div>
    </div>
    <p class="casas-chart-hint">Rueda del mouse para zoom. Mové el cursor para ver valores por mes.</p>
  `;

  const shell = target.querySelector(".casas-chart-shell");
  const svg = target.querySelector("svg");
  const tooltip = target.querySelector(".casas-chart-tooltip");
  if (!shell || !svg || !tooltip) {
    return;
  }

  const width = 900;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 34, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const minVisible = Math.min(8, points.length);
  let visibleCount = points.length;
  let startIndex = 0;
  let hoveredIndex = -1;

  const clampStart = (start, count) => {
    const maxStart = Math.max(0, points.length - count);
    return Math.min(Math.max(0, start), maxStart);
  };

  const getVisiblePoints = () => points.slice(startIndex, startIndex + visibleCount);

  const renderSvg = () => {
    const visible = getVisiblePoints();
    const maxY = Math.max(1, ...visible.map((item) => Number(item.casasMes || 0)));
    const stepX = visible.length > 1 ? innerWidth / (visible.length - 1) : innerWidth;

    const toX = (index) => padding.left + (index * stepX);
    const toY = (value) => padding.top + innerHeight - ((value / maxY) * innerHeight);

    const linePoints = visible.map((point, index) => `${toX(index)},${toY(point.casasMes)}`).join(" ");

    const bars = visible.map((point, index) => {
      const x = toX(index) - 6;
      const y = toY(point.casasMes);
      const h = padding.top + innerHeight - y;
      const isHovered = index === hoveredIndex;
      return `<rect x="${x}" y="${y}" width="12" height="${Math.max(0, h)}" rx="2" fill="${isHovered ? "rgba(212, 111, 42, 0.45)" : "rgba(0, 109, 91, 0.25)"}" />`;
    }).join("");

    const dots = visible.map((point, index) => {
      const isHovered = index === hoveredIndex;
      return `<circle cx="${toX(index)}" cy="${toY(point.casasMes)}" r="${isHovered ? 5 : 3}" fill="${isHovered ? "#d46f2a" : "#006d5b"}" />`;
    }).join("");

    const labels = visible
      .filter((_, index) => index === 0 || index === visible.length - 1 || index % Math.ceil(visible.length / 8) === 0)
      .map((point) => {
        const idx = visible.findIndex((item) => item.mes === point.mes && item.casasMes === point.casasMes);
        return `<text x="${toX(idx)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#5f6663">M${point.mes}</text>`;
      })
      .join("");

    const hoverLine = hoveredIndex >= 0 && hoveredIndex < visible.length
      ? `<line x1="${toX(hoveredIndex)}" y1="${padding.top}" x2="${toX(hoveredIndex)}" y2="${padding.top + innerHeight}" stroke="#d46f2a" stroke-dasharray="3 3" />`
      : "";

    svg.innerHTML = `
      <line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${width - padding.right}" y2="${padding.top + innerHeight}" stroke="#cfd9d5" />
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}" stroke="#cfd9d5" />
      ${bars}
      <polyline points="${linePoints}" fill="none" stroke="#006d5b" stroke-width="2" />
      ${hoverLine}
      ${dots}
      ${labels}
      <text x="${padding.left}" y="12" font-size="10" fill="#5f6663">Max visible: ${maxY}</text>
    `;
  };

  const showTooltip = (event, point) => {
    tooltip.classList.remove("hidden");
    tooltip.textContent = `Mes ${point.mes}: ${point.casasMes} casa(s) iniciada(s)`;
    const rect = shell.getBoundingClientRect();
    const x = event.clientX - rect.left + 12;
    const y = event.clientY - rect.top - 28;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${Math.max(6, y)}px`;
  };

  const hideTooltip = () => {
    tooltip.classList.add("hidden");
  };

  svg.addEventListener("mousemove", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < padding.left || x > rect.width - padding.right) {
      hoveredIndex = -1;
      hideTooltip();
      renderSvg();
      return;
    }

    const visible = getVisiblePoints();
    const localX = x - padding.left;
    const relative = innerWidth > 0 ? localX / innerWidth : 0;
    const index = Math.round(relative * Math.max(visible.length - 1, 0));
    hoveredIndex = Math.min(Math.max(0, index), visible.length - 1);
    renderSvg();
    showTooltip(event, visible[hoveredIndex]);
  });

  svg.addEventListener("mouseleave", () => {
    hoveredIndex = -1;
    hideTooltip();
    renderSvg();
  });

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (points.length <= minVisible) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const visible = getVisiblePoints();
    const localX = Math.min(Math.max(0, x - padding.left), innerWidth);
    const rel = innerWidth > 0 ? localX / innerWidth : 0;
    const anchorOffset = Math.round(rel * Math.max(visible.length - 1, 0));
    const anchorIndex = startIndex + anchorOffset;

    let nextVisible = visibleCount;
    if (event.deltaY < 0) {
      nextVisible = Math.max(minVisible, Math.floor(visibleCount * 0.85));
    } else {
      nextVisible = Math.min(points.length, Math.ceil(visibleCount * 1.15));
    }

    if (nextVisible === visibleCount) {
      return;
    }

    const ratio = visibleCount > 1 ? anchorOffset / (visibleCount - 1) : 0;
    const nextOffset = Math.round(ratio * Math.max(nextVisible - 1, 0));
    startIndex = clampStart(anchorIndex - nextOffset, nextVisible);
    visibleCount = nextVisible;
    hoveredIndex = -1;
    hideTooltip();
    renderSvg();

    const total = points.reduce((acc, item) => acc + Number(item.casasMes || 0), 0);
    summaryTarget.textContent = `Meses graficados: ${points.length} | Casas iniciadas acumuladas en horizonte: ${total} | Zoom: ${points.length - visibleCount + 1}x`;
  }, { passive: false });

  renderSvg();

  const total = points.reduce((acc, item) => acc + Number(item.casasMes || 0), 0);
  summaryTarget.textContent = `Meses graficados: ${points.length} | Casas iniciadas acumuladas en horizonte: ${total}`;
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

  const estado = estadoPlan?.estado ?? estadoPlan ?? null;
  const cuotasActuales = estadoPlan?.cuotas_actuales ?? estadoPlan?.cuotasActuales ?? null;

  if (estado) {
    kpi.viviendasIniciadas.textContent = String(estado.casas_iniciadas ?? 0);
    kpi.viviendasFinalizadas.textContent = `Finalizadas: ${estado.casas_entregadas ?? 0}`;
  }

  if (kpi.cuotaCompletaMes) {
    kpi.cuotaCompletaMes.textContent = typeof cuotasActuales?.cuota_completa_mes_ars === "number"
      ? formatterArs.format(cuotasActuales.cuota_completa_mes_ars)
      : "-";
  }

  if (kpi.mediaCuotaMes) {
    kpi.mediaCuotaMes.textContent = typeof cuotasActuales?.media_cuota_mes_ars === "number"
      ? formatterArs.format(cuotasActuales.media_cuota_mes_ars)
      : "-";
  }
}

export function renderTimeline(tableBody, rows) {
  const fullHeader = `
    <th>Mes</th>
    <th>Activos</th>
    <th>En construcción</th>
    <th>Adjudicados</th>
    <th>Cuota completa mes</th>
    <th>Media cuota mes</th>
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
      "cuotaCompletaMes",
      "cuota_completa_mes",
      "cuota_completa_mes_ars",
      "mediaCuotaMes",
      "media_cuota_mes",
      "media_cuota_mes_ars",
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
      <td>${typeof row.cuotaCompletaMes === "number" ? formatterArs.format(row.cuotaCompletaMes) : (typeof row.cuota_completa_mes === "number" ? formatterArs.format(row.cuota_completa_mes) : (typeof row.cuota_completa_mes_ars === "number" ? formatterArs.format(row.cuota_completa_mes_ars) : "-"))}</td>
      <td>${typeof row.mediaCuotaMes === "number" ? formatterArs.format(row.mediaCuotaMes) : (typeof row.media_cuota_mes === "number" ? formatterArs.format(row.media_cuota_mes) : (typeof row.media_cuota_mes_ars === "number" ? formatterArs.format(row.media_cuota_mes_ars) : "-"))}</td>
      <td>${typeof row.ingresoMes === "number" ? formatterArs.format(row.ingresoMes) : (typeof row.ingreso_mes === "number" ? formatterArs.format(row.ingreso_mes) : (typeof row.ingreso_mes_ars === "number" ? formatterArs.format(row.ingreso_mes_ars) : "-"))}</td>
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
      "cuotaCompletaMes",
      "cuota_completa_mes",
      "cuota_completa_mes_ars",
      "mediaCuotaMes",
      "media_cuota_mes",
      "media_cuota_mes_ars",
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
        <td colspan="6">No hay adherentes para este usuario.</td>
      </tr>
    `;
    summaryTarget.textContent = "Total: 0";
    return;
  }

  tableBody.innerHTML = items.map((item) => `
    <tr data-adherente-id="${item.id}">
      <td>${item.id}</td>
      <td>
        <span class="cell-read">${item.nombre ?? ""}</span>
        <input class="inline-cell-input cell-edit hidden" type="text" value="${item.nombre ?? ""}" data-field="nombre" />
      </td>
      <td>
        <span class="cell-read">${item.estado ?? ""}</span>
        <select class="inline-cell-input cell-edit hidden" data-field="estado">
          <option value="activo" ${item.estado === "activo" ? "selected" : ""}>activo</option>
          <option value="en_construccion" ${item.estado === "en_construccion" ? "selected" : ""}>en_construccion</option>
          <option value="adjudicado" ${item.estado === "adjudicado" ? "selected" : ""}>adjudicado</option>
        </select>
      </td>
      <td>
        <span class="cell-read">${Number(item.cuotas_pagadas ?? 0)}</span>
        <input class="inline-cell-input cell-edit hidden" type="number" min="0" step="1" value="${Number(item.cuotas_pagadas ?? 0)}" data-field="cuotas_pagadas" />
      </td>
      <td>
        <span class="cell-read">${Number(item.cuotas_bonificadas_por_licitacion ?? 0)}</span>
        <input class="inline-cell-input cell-edit hidden" type="number" min="0" step="1" value="${Number(item.cuotas_bonificadas_por_licitacion ?? 0)}" data-field="cuotas_bonificadas_por_licitacion" />
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-table js-edit-adherente" type="button" data-adherente-id="${item.id}">Editar</button>
          <button class="btn-table js-save-adherente hidden" type="button" data-adherente-id="${item.id}">Guardar</button>
          <button class="btn-table js-cancel-adherente hidden" type="button" data-adherente-id="${item.id}">Cancelar</button>
          <button class="btn-table js-delete-adherente" type="button" data-adherente-id="${item.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
  summaryTarget.textContent = `Total: ${items.length}`;
}

export function renderPagos(tableBody, summaryTarget, items) {
  if (!Array.isArray(items) || items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">No hay pagos para este usuario.</td>
      </tr>
    `;
    summaryTarget.textContent = "Total: 0";
    return;
  }

  tableBody.innerHTML = items.map((item) => `
    <tr data-pago-id="${item.id}">
      <td>${item.id}</td>
      <td>
        <span class="cell-read">${Number(item.adherente_id ?? 0)}</span>
        <input class="inline-cell-input cell-edit hidden" type="number" min="1" step="1" value="${Number(item.adherente_id ?? 0)}" data-field="adherente_id" />
      </td>
      <td>
        <span class="cell-read">${formatterArs.format(Number(item.monto_ars ?? 0))}</span>
        <input class="inline-cell-input cell-edit hidden" type="number" min="0" step="0.01" value="${Number(item.monto_ars ?? 0)}" data-field="monto_ars" />
      </td>
      <td>
        <span class="cell-read">${Number(item.mes ?? 1)}</span>
        <input class="inline-cell-input cell-edit hidden" type="number" min="1" step="1" value="${Number(item.mes ?? 1)}" data-field="mes" />
      </td>
      <td>
        <span class="cell-read">${item.fecha ? new Date(item.fecha).toLocaleString("es-AR") : "-"}</span>
        <input class="inline-cell-input cell-edit hidden" type="datetime-local" value="${(item.fecha && !Number.isNaN(new Date(item.fecha).getTime())) ? new Date(item.fecha).toISOString().slice(0, 16) : ""}" data-field="fecha" />
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-table js-edit-pago" type="button" data-pago-id="${item.id}">Editar</button>
          <button class="btn-table js-save-pago hidden" type="button" data-pago-id="${item.id}">Guardar</button>
          <button class="btn-table js-cancel-pago hidden" type="button" data-pago-id="${item.id}">Cancelar</button>
          <button class="btn-table js-delete-pago" type="button" data-pago-id="${item.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
  summaryTarget.textContent = `Total: ${items.length}`;
}

export function normalizeTimeline(payload) {
  const toNumberOrNull = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.replace(/\./g, "").replace(",", ".").trim();
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const mapRow = (row) => {
    if (!row || typeof row !== "object") {
      return null;
    }

    const mes = toNumberOrNull(row.mes ?? row.mes_inicio ?? row.periodo ?? row.periodo_mes);
    const activos = toNumberOrNull(row.activos ?? row.adherentes_activos ?? row.cantidad_activos);
    const enConstruccion = toNumberOrNull(row.enConstruccion ?? row.en_construccion ?? row.adherentes_en_construccion);
    const adjudicados = toNumberOrNull(row.adjudicados ?? row.adherentes_adjudicados ?? row.casas_adjudicadas);
    const cuotaCompletaMes = toNumberOrNull(row.cuotaCompletaMes ?? row.cuota_completa_mes ?? row.cuota_completa_mes_ars ?? row.cuota_mes_completa);
    const mediaCuotaMes = toNumberOrNull(row.mediaCuotaMes ?? row.media_cuota_mes ?? row.media_cuota_mes_ars ?? row.cuota_mes_media);
    const ingresoMes = toNumberOrNull(row.ingresoMes ?? row.ingreso_mes ?? row.ingreso_mes_ars ?? row.ingreso_mensual_ars);
    const fondo = toNumberOrNull(row.fondo ?? row.fondo_cierre ?? row.fondo_ars ?? row.fondo_final_ars ?? row.fondo_mes_ars ?? row.saldo_fondo_ars);
    const casasIniciadasMes = toNumberOrNull(row.casasIniciadasMes ?? row.casas_iniciadas_mes ?? row.viviendas_iniciadas_mes ?? row.casas_mes ?? row.inicios_mes);
    const casasIniciadasAcumuladas = toNumberOrNull(row.casasIniciadasAcumuladas ?? row.casas_iniciadas ?? row.viviendas_iniciadas);

    let evento = row.evento ?? row.evento_mes ?? row.descripcion ?? row.detalle ?? null;
    if (!evento && row.casa_numero != null && mes != null) {
      evento = `Inicio casa ${row.casa_numero}`;
    }

    return { mes, activos, enConstruccion, adjudicados, cuotaCompletaMes, mediaCuotaMes, ingresoMes, fondo, casasIniciadasMes, casasIniciadasAcumuladas, evento };
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
