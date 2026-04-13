import { formatterArs } from "./formatters.js";
import { DEBUG_UI } from "./settings.js";
import {
  listarSimulacionesGuardadas,
  obtenerDetalleSimulacion,
  crearSimulacionGuardada,
  actualizarSimulacionGuardada,
  clonarSimulacionGuardada,
  recalcularSimulacionGuardada,
  guardarSimulacionComoCopia,
  listarCasasSimulacion,
  crearCasaSimulacion,
  actualizarCasaSimulacion,
  listarPlanillasCasa,
  crearPlanillaCasa,
  actualizarPlanillaCasa,
  listarItemsPlanilla,
  crearItemPlanilla,
  actualizarItemPlanilla,
  listarMaterialesItem,
  crearMaterialPlanilla,
  actualizarMaterialPlanilla,
  listarMovimientosMaterial,
  registrarMovimientoEntrega,
  listarGastosCasa,
  crearGastoCasa,
  actualizarGastoCasa,
  listarManoObraCasa,
  crearManoObraCasa,
  actualizarManoObraCasa,
  eliminarSimulacion,
  eliminarPlanillaCasa,
  eliminarItemPlanilla,
  eliminarMaterialPlanilla,
  eliminarGastoCasa,
  eliminarManoObraCasa
} from "./services.js";

function money(value) {
  return formatterArs.format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]|'/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[match]));
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTimestamp(value) {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function formatDateForInput(value) {
  if (!value) return "";
  const str = String(value).trim();
  // Si ya está en formato yyyy-MM-dd, devolver tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Si es ISO o timestamp, extraer la fecha
  const date = new Date(str);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function asList(payload, keys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  function collectArraysDeep(node, preferredKeys, visited = new WeakSet(), out = []) {
    if (!node || typeof node !== "object") {
      return out;
    }

    if (visited.has(node)) {
      return out;
    }
    visited.add(node);

    Object.entries(node).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        out.push({
          value,
          key,
          keyMatched: preferredKeys.includes(key)
        });
      } else if (value && typeof value === "object") {
        collectArraysDeep(value, preferredKeys, visited, out);
      }
    });

    return out;
  }

  if (payload && typeof payload === "object") {
    const candidates = collectArraysDeep(payload, keys);
    if (candidates.length) {
      const byPreferredKeyWithData = candidates.find((entry) => entry.keyMatched && entry.value.length > 0);
      if (byPreferredKeyWithData) {
        return byPreferredKeyWithData.value;
      }

      const byPreferredKey = candidates.find((entry) => entry.keyMatched);
      if (byPreferredKey) {
        return byPreferredKey.value;
      }

      // Si hay claves esperadas, no debemos tomar arrays arbitrarios
      // (ej: timeline/ofertas) porque rompe el armado del árbol de entregas.
      if (keys.length > 0) {
        return [];
      }

      const anyWithData = candidates.find((entry) => entry.value.length > 0);
      if (anyWithData) {
        return anyWithData.value;
      }

      return candidates[0].value;
    }
  }

  return [];
}

function normalizeMovimiento(raw) {
  return {
    id: raw?.id ?? raw?.movimiento_id ?? raw?.entrega_id ?? `mov-${Math.random().toString(16).slice(2)}`,
    fecha: raw?.fecha ?? raw?.created_at ?? raw?.createdAt ?? null,
    tipo: String(raw?.tipo ?? raw?.tipo_movimiento ?? raw?.kind ?? "entrega").trim(),
    cantidad: numberOrZero(raw?.cantidad ?? raw?.cantidad_ars ?? raw?.monto ?? 0),
    observacion: String(raw?.observacion ?? raw?.nota ?? raw?.descripcion ?? "").trim(),
    proveedor: String(raw?.proveedor ?? "").trim(),
    contratista: String(raw?.contratista ?? "").trim(),
    adherente: String(raw?.adherente ?? raw?.adherente_nombre ?? "").trim()
  };
}

function normalizeMaterial(raw) {
  const cantidadTotal = numberOrZero(raw?.cantidad_total ?? raw?.cantidad ?? 0);
  const cantidadRetiradaRaw = numberOrZero(raw?.cantidad_retirada ?? 0);
  const precioUnitarioArs = numberOrZero(raw?.precio_unitario_ars ?? raw?.precio_unitario ?? raw?.precio ?? 0);
  const totalArs = numberOrZero(raw?.total_ars ?? (cantidadTotal * precioUnitarioArs));
  const movimientos = safeArray(raw?.movimientos ?? raw?.movimientos_entrega ?? raw?.entregas).map(normalizeMovimiento);
  const retiradoPorMovimientos = movimientos.reduce((acc, movement) => {
    const qty = numberOrZero(movement.cantidad);
    if (movement.tipo === "retiro") {
      return acc - qty;
    }
    return acc + qty;
  }, 0);
  const cantidadRetirada = Number(Math.max(0, Math.max(cantidadRetiradaRaw, retiradoPorMovimientos)).toFixed(2));
  const cantidadEnConstruccion = Number(Math.max(0, cantidadTotal - cantidadRetirada).toFixed(2));

  return {
    id: raw?.id ?? raw?.material_id ?? `mat-${Math.random().toString(16).slice(2)}`,
    nombre: String(raw?.nombre ?? "Material").trim(),
    unidad: String(raw?.unidad ?? "u").trim(),
    proveedor: String(raw?.proveedor ?? "").trim(),
    descripcion: String(raw?.descripcion ?? "").trim(),
    nota: String(raw?.nota ?? raw?.observacion ?? "").trim(),
    cantidad_total: Number(cantidadTotal.toFixed(2)),
    cantidad_retirada: Number(cantidadRetirada.toFixed(2)),
    cantidad_en_construccion: Number(cantidadEnConstruccion.toFixed(2)),
    precio_unitario_ars: Number(precioUnitarioArs.toFixed(2)),
    total_ars: Number(totalArs.toFixed(2)),
    movimientos
  };
}

function normalizeItem(raw) {
  const materiales = safeArray(raw?.materiales).map(normalizeMaterial);
  const totalMaterialesArs = materiales.reduce((acc, material) => acc + numberOrZero(material.total_ars), 0);

  return {
    id: raw?.id ?? raw?.item_id ?? `item-${Math.random().toString(16).slice(2)}`,
    nombre: String(raw?.nombre ?? "Item").trim(),
    proveedor: String(raw?.proveedor ?? "").trim(),
    descripcion: String(raw?.descripcion ?? "").trim(),
    orden: numberOrZero(raw?.orden ?? 0),
    materiales,
    total_materiales_ars: Number(totalMaterialesArs.toFixed(2))
  };
}

function normalizePlanilla(raw) {
  const items = safeArray(raw?.items).map(normalizeItem);
  const totalMaterialesArs = items.reduce((acc, item) => acc + numberOrZero(item.total_materiales_ars), 0);

  return {
    id: raw?.id ?? raw?.planilla_id ?? `planilla-${Math.random().toString(16).slice(2)}`,
    numero: String(raw?.numero ?? raw?.nro ?? raw?.numero_planilla ?? raw?.nro_planilla ?? "").trim(),
    fecha: raw?.fecha ?? null,
    vencimiento: raw?.vencimiento ?? raw?.fecha_vencimiento ?? null,
    proveedor: String(raw?.proveedor ?? "").trim(),
    contratista: String(raw?.contratista ?? "").trim(),
    adherente: String(raw?.adherente ?? raw?.adherente_nombre ?? "").trim(),
    direccion: String(raw?.direccion ?? "").trim(),
    observaciones: String(raw?.observaciones ?? raw?.observacion ?? "").trim(),
    items,
    total_materiales_ars: Number(totalMaterialesArs.toFixed(2))
  };
}

function normalizeGasto(raw) {
  return {
    id: raw?.id ?? `gasto-${Math.random().toString(16).slice(2)}`,
    nombre: String(raw?.nombre ?? "Gasto").trim(),
    descripcion: String(raw?.descripcion ?? "").trim(),
    monto_ars: Number(numberOrZero(raw?.monto_ars ?? raw?.monto ?? 0).toFixed(2))
  };
}

function normalizeManoObra(raw) {
  return {
    id: raw?.id ?? `mano-obra-${Math.random().toString(16).slice(2)}`,
    rubro: String(raw?.rubro ?? "Mano de obra").trim(),
    descripcion: String(raw?.descripcion ?? "").trim(),
    monto_ars: Number(numberOrZero(raw?.monto_ars ?? raw?.monto ?? 0).toFixed(2)),
    fecha: raw?.fecha ?? new Date().toISOString()
  };
}

function normalizeCasa(raw) {
  const planillas = safeArray(raw?.planillas ?? raw?.entregas ?? raw?.ordenes ?? raw?.planillas_entrega ?? raw?.planillas_casa).map(normalizePlanilla);
  const gastos = safeArray(raw?.gastos).map(normalizeGasto);
  const mano_obra = safeArray(raw?.["mano-obra"] ?? raw?.mano_obra).map(normalizeManoObra);
  const materiales = planillas.flatMap((planilla) => safeArray(planilla.items).flatMap((item) => safeArray(item.materiales)));
  const totalMateriales = planillas.reduce((acc, planilla) => acc + numberOrZero(planilla.total_materiales_ars), 0);
  const totalGastos = gastos.reduce((acc, gasto) => acc + numberOrZero(gasto.monto_ars), 0);
  const totalManoObra = mano_obra.reduce((acc, mo) => acc + numberOrZero(mo.monto_ars), 0);
  const totalCantidadMaterial = materiales.reduce((acc, material) => acc + numberOrZero(material.cantidad_total), 0);
  const totalRetiradoCantidad = materiales.reduce((acc, material) => acc + numberOrZero(material.cantidad_retirada), 0);
  const totalEnConstruccionCantidad = materiales.reduce((acc, material) => acc + numberOrZero(material.cantidad_en_construccion), 0);
  const precioArs = numberOrZero(raw?.precio_ars ?? raw?.precio ?? 0);
  const fondoDisponibleArs = numberOrZero(raw?.fondo_disponible_ars ?? raw?.fondo_ars ?? raw?.plata_disponible_ars ?? precioArs);
  const comprometidoArs = Number((totalMateriales + totalGastos + totalManoObra).toFixed(2));
  const saldoDisponibleArs = Number((fondoDisponibleArs - comprometidoArs).toFixed(2));
  const avance = fondoDisponibleArs > 0 ? Number(Math.min(100, Math.max(0, (comprometidoArs / fondoDisponibleArs) * 100)).toFixed(2)) : 0;

  return {
    id: raw?.id ?? raw?.casa_id ?? raw?.house_id ?? `casa-${Math.random().toString(16).slice(2)}`,
    adherente_id: raw?.adherente_id ?? raw?.adherenteId ?? null,
    adherente_nombre: String(raw?.adherente_nombre ?? raw?.adherenteNombre ?? raw?.adherente ?? "").trim(),
    precio_ars: Number(precioArs.toFixed(2)),
    descripcion: String(raw?.descripcion ?? "").trim(),
    completada: Boolean(raw?.completada ?? raw?.is_completed ?? false),
    planillas,
    gastos,
    mano_obra,
    fondo_disponible_ars: Number(fondoDisponibleArs.toFixed(2)),
    total_material_cantidad: Number(totalCantidadMaterial.toFixed(2)),
    total_retirado_cantidad: Number(totalRetiradoCantidad.toFixed(2)),
    total_en_construccion_cantidad: Number(totalEnConstruccionCantidad.toFixed(2)),
    total_materiales_ars: Number(totalMateriales.toFixed(2)),
    total_gastos_ars: Number(totalGastos.toFixed(2)),
    total_mano_obra_ars: Number(totalManoObra.toFixed(2)),
    saldo_ars: saldoDisponibleArs,
    avance_financiero_pct: avance
  };
}

function normalizeSimulation(detail, fallbackId = null) {
  return {
    id: detail?.id ?? fallbackId,
    snapshot_id: detail?.snapshot_id ?? null,
    titulo: String(detail?.titulo ?? detail?.title ?? "Simulacion").trim(),
    descripcion: String(detail?.descripcion ?? detail?.description ?? "").trim(),
    configuracion: detail?.configuracion ?? detail?.parametros ?? {},
    ofertas: safeArray(detail?.ofertas).map((offer) => ({
      adherente_id: numberOrZero(offer?.adherente_id ?? offer?.adherenteId),
      monto_ars: Number(numberOrZero(offer?.monto_ars ?? offer?.montoArs).toFixed(2))
    })),
    resumen: detail?.resumen ?? null,
    timeline: safeArray(detail?.timeline),
    casas: safeArray(detail?.casas).map(normalizeCasa),
    horizonte_meses: detail?.horizonte_meses ?? 120,
    created_at: detail?.created_at ?? detail?.fecha_creacion ?? null,
    updated_at: detail?.updated_at ?? detail?.fecha_actualizacion ?? null
  };
}

function aggregateMateriales(casas) {
  const grouped = new Map();
  casas.forEach((casa) => {
    casa.planillas.forEach((planilla) => {
      planilla.items.forEach((item) => {
        item.materiales.forEach((material) => {
          const key = `${material.nombre.toLowerCase()}::${material.unidad.toLowerCase()}`;
          const current = grouped.get(key) || {
            nombre: material.nombre,
            unidad: material.unidad,
            cantidad_total: 0,
            cantidad_retirada: 0,
            cantidad_en_construccion: 0,
            total_ars: 0
          };
          current.cantidad_total += numberOrZero(material.cantidad_total);
          current.cantidad_retirada += numberOrZero(material.cantidad_retirada);
          current.cantidad_en_construccion += numberOrZero(material.cantidad_en_construccion);
          current.total_ars += numberOrZero(material.total_ars);
          grouped.set(key, current);
        });
      });
    });
  });

  return Array.from(grouped.values()).map((row) => ({
    ...row,
    cantidad_total: Number(row.cantidad_total.toFixed(2)),
    cantidad_retirada: Number(row.cantidad_retirada.toFixed(2)),
    cantidad_en_construccion: Number(row.cantidad_en_construccion.toFixed(2)),
    total_ars: Number(row.total_ars.toFixed(2))
  }));
}

function buildSummary(detail) {
  const casas = safeArray(detail?.casas);
  const materiales = aggregateMateriales(casas);
  const planillas = casas.flatMap((casa) => casa.planillas || []);
  const items = planillas.flatMap((planilla) => planilla.items || []);
  const gastos = casas.flatMap((casa) => casa.gastos || []);
  const mano_obra = casas.flatMap((casa) => casa.mano_obra || []);
  const movimientos = casas
    .flatMap((casa) => casa.planillas || [])
    .flatMap((planilla) => planilla.items || [])
    .flatMap((item) => item.materiales || [])
    .flatMap((material) => material.movimientos || []);
  const totalMateriales = materiales.reduce((acc, material) => acc + numberOrZero(material.total_ars), 0);
  const totalGastos = gastos.reduce((acc, gasto) => acc + numberOrZero(gasto.monto_ars), 0);
  const totalManoObra = mano_obra.reduce((acc, mo) => acc + numberOrZero(mo.monto_ars), 0);
  const totalSaldo = casas.reduce((acc, casa) => acc + numberOrZero(casa.saldo_ars), 0);

  return {
    casas: casas.length,
    planillas: planillas.length,
    items: items.length,
    materiales: materiales.length,
    movimientos: movimientos.length,
    gastos: gastos.length,
    mano_obra: mano_obra.length,
    totalMateriales: Number(totalMateriales.toFixed(2)),
    totalGastos: Number(totalGastos.toFixed(2)),
    totalManoObra: Number(totalManoObra.toFixed(2)),
    totalSaldo: Number(totalSaldo.toFixed(2)),
    materialesAgrupados: materiales,
    timeline: detail?.timeline || []
  };
}

function inputField(label, name, value, type = "text", extra = "") {
  return `
    <label>
      ${escapeHtml(label)}
      <input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra} />
    </label>
  `;
}

function textAreaField(label, name, value, rows = 2, extra = "") {
  return `
    <label>
      ${escapeHtml(label)}
      <textarea name="${name}" rows="${rows}" ${extra}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function checkboxField(label, name, checked = false) {
  return `
    <label class="inline-check">
      <input name="${name}" type="checkbox" ${checked ? "checked" : ""} />
      ${escapeHtml(label)}
    </label>
  `;
}

function selectField(label, name, value, options) {
  return `
    <label>
      ${escapeHtml(label)}
      <select name="${name}">
        ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderMovements(movements) {
  if (!Array.isArray(movements) || movements.length === 0) {
    return `<p class="inventory-empty">Sin movimientos cargados.</p>`;
  }

  return `
    <div class="inventory-rows">
      ${movements.map((movement) => `
        <article class="inventory-mini-card">
          <div class="inventory-mini-head">
            <strong>${escapeHtml(movement.tipo || "entrega")}</strong>
            <span>${movement.fecha ? new Date(movement.fecha).toLocaleDateString("es-AR") : "sin fecha"}</span>
          </div>
          <p>${money(movement.cantidad)}</p>
          <p>${escapeHtml(movement.observacion || movement.descripcion || "Sin observaciones")}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderHouseMaterials(house) {
  const grouped = aggregateMateriales([house]);
  if (!grouped.length) {
    return '<p class="inventory-empty">Sin materiales cargados en esta casa.</p>';
  }

  return `
    <div class="inventory-rows">
      ${grouped.map((material) => `
        <article class="inventory-mini-card">
          <div class="inventory-mini-head">
            <strong>${escapeHtml(material.nombre)}</strong>
            <span>${escapeHtml(material.unidad)}</span>
          </div>
          <p>Total: ${escapeHtml(material.cantidad_total)} | Retirado: ${escapeHtml(material.cantidad_retirada)} | En obra: ${escapeHtml(material.cantidad_en_construccion)}</p>
          <p>${money(material.total_ars)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderMaterial(material, context) {
  const { simulacionId, casaId, planillaId, itemId } = context;
  return `
    <details class="inventory-card inventory-card-material" data-material-id="${escapeHtml(material.id)}" open>
      <summary class="inventory-summary">
        <div>
          <p class="inventory-kicker">Material #${escapeHtml(material.id)}</p>
          <h6>${escapeHtml(material.nombre)}</h6>
          <p class="inventory-subtitle">Total ${money(material.total_ars)} | Cantidad ${escapeHtml(material.cantidad_total)} ${escapeHtml(material.unidad)}</p>
        </div>
        <div class="inventory-badges">
          <span>Retirado ${escapeHtml(material.cantidad_retirada)}</span>
          <span>En obra ${escapeHtml(material.cantidad_en_construccion)}</span>
        </div>
      </summary>

      <div class="inventory-card-tools">
        <button class="btn btn-ghost" type="button" data-action="toggle-card-edit">Editar material</button>
        <button class="btn btn-ghost" type="button" data-action="toggle-create-movement">Agregar movimiento</button>
        <button class="btn btn-ghost" type="button" data-action="delete-material" data-material-id="${escapeHtml(material.id)}" style="color:#d32f2f;">Borrar</button>
      </div>

      <form class="inventory-form inventory-editable-form inventory-form-tight inventory-grid-3" data-action="update-material" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-planilla-id="${escapeHtml(planillaId)}" data-item-id="${escapeHtml(itemId)}" data-material-id="${escapeHtml(material.id)}">
        ${inputField("Nombre", "nombre", material.nombre)}
        ${inputField("Unidad", "unidad", material.unidad)}
        ${inputField("Proveedor", "proveedor", material.proveedor)}
        ${inputField("Descripción", "descripcion", material.descripcion)}
        ${inputField("Cantidad total", "cantidad_total", material.cantidad_total, "number", "min=0 step=0.01")}
        ${inputField("Cantidad retirada", "cantidad_retirada", material.cantidad_retirada, "number", "min=0 step=0.01")}
        ${inputField("Cantidad en construcción", "cantidad_en_construccion", material.cantidad_en_construccion, "number", "min=0 step=0.01")}
        ${inputField("Precio unitario ARS", "precio_unitario_ars", material.precio_unitario_ars, "number", "min=0 step=0.01")}
        ${inputField("Nota", "nota", material.nota)}
        <label>
          Total ARS
          <input name="total_ars" type="number" value="${escapeHtml(material.total_ars)}" readonly />
        </label>
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-secondary" type="submit">Guardar material</button>
        </div>
      </form>

      <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-2" data-action="create-movement" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-planilla-id="${escapeHtml(planillaId)}" data-item-id="${escapeHtml(itemId)}" data-material-id="${escapeHtml(material.id)}">
        ${inputField("Cantidad entregada", "cantidad", 0, "number", "min=0 step=0.01")}
        ${inputField("Fecha", "fecha", new Date().toISOString().slice(0, 10), "date")}
        ${selectField("Tipo", "tipo", "entrega", [
          { value: "entrega", label: "Entrega" },
          { value: "retiro", label: "Retiro" },
          { value: "ajuste", label: "Ajuste" }
        ])}
        ${inputField("Observación", "observacion", "")}
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-primary" type="submit">Registrar movimiento</button>
        </div>
      </form>

      <div class="inventory-section">
        <h6>Movimientos</h6>
        ${renderMovements(material.movimientos)}
      </div>
    </details>
  `;
}

function renderItem(item, context) {
  const { simulacionId, casaId, planillaId } = context;
  return `
    <details class="inventory-card inventory-card-item" data-item-id="${escapeHtml(item.id)}" open>
      <summary class="inventory-summary">
        <div>
          <p class="inventory-kicker">Item #${escapeHtml(item.id)}</p>
          <h6>${escapeHtml(item.nombre)}</h6>
          <p class="inventory-subtitle">Total materiales ${money(item.total_materiales_ars)}</p>
        </div>
        <div class="inventory-badges">
          <span>${escapeHtml(item.materiales.length)} materiales</span>
        </div>
      </summary>

      <div class="inventory-card-tools">
        <button class="btn btn-ghost" type="button" data-action="toggle-card-edit">Editar item</button>
        <button class="btn btn-ghost" type="button" data-action="toggle-create-material">Agregar material</button>
        <button class="btn btn-ghost" type="button" data-action="delete-item" data-item-id="${escapeHtml(item.id)}" style="color:#d32f2f;">Borrar</button>
      </div>

      <div class="inventory-inline-metrics">
        <span>Total item: ${money(item.total_materiales_ars)}</span>
        <span>Materiales: ${escapeHtml(item.materiales.length)}</span>
      </div>

      <form class="inventory-form inventory-editable-form inventory-form-tight inventory-grid-2" data-action="update-item" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-planilla-id="${escapeHtml(planillaId)}" data-item-id="${escapeHtml(item.id)}">
        ${inputField("Nombre", "nombre", item.nombre)}
        ${inputField("Proveedor", "proveedor", item.proveedor)}
        ${inputField("Orden", "orden", item.orden, "number", "step=1")}
        ${textAreaField("Descripción", "descripcion", item.descripcion, 2)}
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-secondary" type="submit">Guardar item</button>
        </div>
      </form>

      <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-3" data-action="create-material" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-planilla-id="${escapeHtml(planillaId)}" data-item-id="${escapeHtml(item.id)}">
        ${inputField("Nombre", "nombre", "")}
        ${inputField("Unidad", "unidad", "u")}
        ${inputField("Proveedor", "proveedor", "")}
        ${inputField("Descripción", "descripcion", "")}
        ${inputField("Cantidad total", "cantidad_total", 0, "number", "min=0 step=0.01")}
        ${inputField("Cantidad retirada", "cantidad_retirada", 0, "number", "min=0 step=0.01")}
        ${inputField("Cantidad en construcción", "cantidad_en_construccion", 0, "number", "min=0 step=0.01")}
        ${inputField("Precio unitario ARS", "precio_unitario_ars", 0, "number", "min=0 step=0.01")}
        ${textAreaField("Nota", "nota", "", 2)}
        <label>
          Total ARS
          <input name="total_ars" type="number" value="0" readonly />
        </label>
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-primary" type="submit">Agregar material</button>
        </div>
      </form>

      <div class="inventory-children">
        ${item.materiales.length === 0 ? '<p class="inventory-empty">Sin materiales cargados.</p>' : item.materiales.map((material) => renderMaterial(material, { simulacionId, casaId, planillaId, itemId: item.id })).join("")}
      </div>
    </details>
  `;
}

function renderPlanilla(planilla, context) {
  const { simulacionId, casaId } = context;
  return `
    <details class="inventory-card inventory-card-planilla" data-planilla-id="${escapeHtml(planilla.id)}" open>
      <summary class="inventory-summary">
        <div>
          <p class="inventory-kicker">Planilla #${escapeHtml(planilla.numero || planilla.id)}</p>
          <h6>${escapeHtml(planilla.proveedor || planilla.contratista || planilla.adherente || "Planilla")}</h6>
          <p class="inventory-subtitle">Items ${escapeHtml(planilla.items.length)} | Materiales ${money(planilla.total_materiales_ars)}</p>
        </div>
        <div class="inventory-badges">
          <span>${escapeHtml(planilla.fecha || "sin fecha")}</span>
          <span>Vto ${escapeHtml(planilla.vencimiento || "-")}</span>
        </div>
      </summary>

      <div class="inventory-card-tools">
        <button class="btn btn-ghost" type="button" data-action="toggle-card-edit">Editar planilla</button>
        <button class="btn btn-ghost" type="button" data-action="toggle-create-item">Agregar item</button>
        <button class="btn btn-ghost" type="button" data-action="delete-planilla" data-planilla-id="${escapeHtml(planilla.id)}" style="color:#d32f2f;">Borrar</button>
      </div>

      <form class="inventory-form inventory-editable-form inventory-form-tight inventory-grid-3" data-action="update-planilla" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-planilla-id="${escapeHtml(planilla.id)}">
        ${inputField("Número", "numero", planilla.numero)}
        ${inputField("Fecha", "fecha", formatDateForInput(planilla.fecha), "date")}
        ${inputField("Vencimiento", "vencimiento", formatDateForInput(planilla.vencimiento), "date")}
        ${inputField("Proveedor", "proveedor", planilla.proveedor)}
        ${inputField("Contratista", "contratista", planilla.contratista)}
        ${inputField("Adherente", "adherente", planilla.adherente)}
        ${inputField("Dirección", "direccion", planilla.direccion)}
        ${textAreaField("Observaciones", "observaciones", planilla.observaciones, 2)}
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-secondary" type="submit">Guardar planilla</button>
        </div>
      </form>

      <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-3" data-action="create-item" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-planilla-id="${escapeHtml(planilla.id)}">
        ${inputField("Nombre", "nombre", "")}
        ${inputField("Proveedor", "proveedor", "")}
        ${inputField("Descripción", "descripcion", "")}
        ${inputField("Orden", "orden", 1, "number", "step=1")}
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-primary" type="submit">Agregar item</button>
        </div>
      </form>

      <div class="inventory-children">
        ${planilla.items.length === 0 ? '<p class="inventory-empty">Sin items cargados.</p>' : planilla.items.map((item) => renderItem(item, { simulacionId, casaId, planillaId: planilla.id })).join("")}
      </div>
    </details>
  `;
}

function renderGasto(gasto, context) {
  const { simulacionId, casaId } = context;
  return `
    <article class="inventory-mini-card inventory-mini-card-gasto" data-gasto-id="${escapeHtml(gasto.id)}">
      <div class="inventory-card-tools">
        <button class="btn btn-ghost" type="button" data-action="toggle-card-edit">Editar gasto</button>
        <button class="btn btn-ghost" type="button" data-action="delete-gasto" data-gasto-id="${escapeHtml(gasto.id)}" style="color:#d32f2f;">Borrar</button>
      </div>
      <form class="inventory-form inventory-editable-form inventory-form-tight inventory-grid-2" data-action="update-gasto" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-gasto-id="${escapeHtml(gasto.id)}">
        ${inputField("Nombre", "nombre", gasto.nombre)}
        ${inputField("Monto ARS", "monto_ars", gasto.monto_ars, "number", "min=0 step=0.01")}
        ${textAreaField("Descripción", "descripcion", gasto.descripcion, 2)}
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-ghost" type="submit">Guardar gasto</button>
        </div>
      </form>
    </article>
  `;
}

function renderManoObra(manoObra, context) {
  const { simulacionId, casaId } = context;
  const fechaFormato = manoObra.fecha ? new Date(manoObra.fecha).toLocaleDateString('es-AR') : 'Sin fecha';
  return `
    <article class="inventory-mini-card inventory-mini-card-mano-obra" data-mano-obra-id="${escapeHtml(manoObra.id)}">
      <div class="inventory-card-tools">
        <button class="btn btn-ghost" type="button" data-action="toggle-card-edit">Editar</button>
        <button class="btn btn-ghost" type="button" data-action="delete-mano-obra" data-mano-obra-id="${escapeHtml(manoObra.id)}" style="color:#d32f2f;">Borrar</button>
      </div>
      <div class="inventory-card-read" style="display:flex;flex-direction:column;gap:0.3rem;">
        <p><strong>${escapeHtml(manoObra.rubro)}</strong></p>
        <p style="font-size:0.9rem;color:#666;">${escapeHtml(manoObra.descripcion || '(sin descripción)')}</p>
        <p style="font-size:0.9rem;color:#666;">${fechaFormato}</p>
        ${manoObra.porcentaje ? `<p style="font-size:0.9rem;color:#666;">Porcentaje: ${manoObra.porcentaje}%</p>` : ''}
        <p style="font-weight:600;color:#d9534f;">${money(manoObra.monto_ars)}</p>
      </div>
      <form class="inventory-form inventory-editable-form inventory-form-tight inventory-grid-2" data-action="update-mano-obra" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-mano-obra-id="${escapeHtml(manoObra.id)}">
        ${inputField("Rubro", "rubro", manoObra.rubro)}
        <fieldset style="border:none;padding:0;margin:0;">
          <legend style="font-size:0.9rem;margin-bottom:0.5rem;">Tipo de mano de obra</legend>
          <label style="display:inline-flex;align-items:center;gap:0.5rem;margin-right:1rem;">
            <input type="radio" name="mano_obra_tipo" value="monto" ${!manoObra.porcentaje ? 'checked' : ''} />
            Monto fijo
          </label>
          <label style="display:inline-flex;align-items:center;gap:0.5rem;">
            <input type="radio" name="mano_obra_tipo" value="porcentaje" ${manoObra.porcentaje ? 'checked' : ''} />
            Porcentaje
          </label>
        </fieldset>
        <div id="campo-monto-ars-${escapeHtml(manoObra.id)}" style="grid-column:1/-1;${manoObra.porcentaje ? 'display:none;' : ''}">
          ${inputField("Monto ARS", "monto_ars", manoObra.monto_ars, "number", "min=0 step=0.01")}
        </div>
        <div id="campo-porcentaje-${escapeHtml(manoObra.id)}" style="grid-column:1/-1;${manoObra.porcentaje ? '' : 'display:none;'}">
          ${inputField("Porcentaje (%)", "porcentaje", manoObra.porcentaje || 0, "number", "min=0 max=100 step=0.01")}
        </div>
        ${inputField("Fecha", "fecha", manoObra.fecha ? manoObra.fecha.split('T')[0] : new Date().toISOString().split('T')[0], "date")}
        ${textAreaField("Descripción", "descripcion", manoObra.descripcion, 2)}
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-ghost" type="submit">Guardar mano de obra</button>
        </div>
      </form>
    </article>
  `;
}

function renderHouse(house, context) {
  const { simulacionId } = context;
  const comprometidoArs = Number((numberOrZero(house.total_materiales_ars) + numberOrZero(house.total_gastos_ars)).toFixed(2));
  const progressPct = numberOrZero(house.avance_financiero_pct);
  const materialTargets = house.planillas.flatMap((planilla) =>
    safeArray(planilla.items).map((item) => ({
      value: `${planilla.id}::${item.id}`,
      label: `Planilla ${planilla.numero || planilla.id} - Item ${item.nombre}`
    }))
  );
  const houseItems = house.planillas.flatMap((planilla) =>
    safeArray(planilla.items).map((item) => ({
      planilla,
      item
    }))
  );

  return `
    <article class="inventory-card inventory-card-house" data-casa-id="${escapeHtml(house.id)}">
      <div class="inventory-card-head">
        <div>
          <p class="inventory-kicker">Casa #${escapeHtml(house.id)}</p>
          <h4>${escapeHtml(house.adherente_nombre || `Casa ${house.id}`)}</h4>
          <p class="inventory-subtitle">Saldo ${money(house.saldo_ars)} | Materiales ${money(house.total_materiales_ars)} | Gastos ${money(house.total_gastos_ars)} | Mano de obra ${money(house.total_mano_obra_ars)}</p>
        </div>
        <div class="inventory-badges">
          <span>${escapeHtml(house.planillas.length)} planillas</span>
          <span>${escapeHtml(house.completada ? "Completada" : "En curso")}</span>
          <span>${escapeHtml(house.avance_financiero_pct)}%</span>
        </div>
      </div>

      <div class="inventory-card-tools">
        <button class="btn btn-ghost" type="button" data-action="toggle-card-edit">Editar casa</button>
      </div>

      <section class="house-finance-panel">
        <div class="house-finance-grid">
          <article><p>Fondo disponible</p><strong>${money(house.fondo_disponible_ars)}</strong></article>
          <article><p>Comprometido</p><strong>${money(comprometidoArs)}</strong></article>
          <article><p>Total material</p><strong>${escapeHtml(house.total_material_cantidad)}</strong></article>
          <article><p>Total retirado</p><strong>${escapeHtml(house.total_retirado_cantidad)}</strong></article>
          <article><p>En construcción</p><strong>${escapeHtml(house.total_en_construccion_cantidad)}</strong></article>
          <article><p>Saldo disponible</p><strong>${money(house.saldo_ars)}</strong></article>
        </div>
        <div class="progress-track" aria-label="Uso del fondo de la casa">
          <div class="progress-fill" style="width:${escapeHtml(progressPct)}%"></div>
        </div>
        <p class="inventory-subtitle">Uso de fondo: ${escapeHtml(progressPct)}%</p>
      </section>

      <form class="inventory-form inventory-editable-form inventory-form-tight inventory-grid-3" data-action="update-house" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(house.id)}">
        ${inputField("Adherente ID", "adherente_id", house.adherente_id ?? "", "number", "min=1 step=1")}
        ${inputField("Adherente", "adherente_nombre", house.adherente_nombre)}
        ${inputField("Precio ARS", "precio_ars", house.precio_ars, "number", "min=0 step=0.01")}
        ${inputField("Fondo disponible ARS", "fondo_disponible_ars", house.fondo_disponible_ars, "number", "min=0 step=0.01")}
        ${textAreaField("Descripción", "descripcion", house.descripcion, 2)}
        ${checkboxField("Casa completada", "completada", house.completada)}
        <div class="inventory-actions inventory-actions-full">
          <button class="btn btn-secondary" type="submit">Guardar casa</button>
        </div>
      </form>

      <section class="inventory-section">
        <div class="house-selector-grid">
          <button type="button" class="house-selector-card is-page-link" data-action="nav-planillas">
            <p class="inventory-kicker">Sección</p>
            <h4>Planillas</h4>
            <p class="inventory-subtitle">${escapeHtml(house.planillas.length)} planillas registradas</p>
          </button>
          <button type="button" class="house-selector-card is-page-link" data-action="nav-items">
            <p class="inventory-kicker">Sección</p>
            <h4>Items</h4>
            <p class="inventory-subtitle">${escapeHtml(houseItems.length)} items registrados</p>
          </button>
          <button type="button" class="house-selector-card is-page-link" data-action="nav-materiales">
            <p class="inventory-kicker">Sección</p>
            <h4>Materiales</h4>
            <p class="inventory-subtitle">Vista consolidada de todos los materiales</p>
          </button>
          <button type="button" class="house-selector-card is-page-link" data-action="nav-gastos">
            <p class="inventory-kicker">Sección</p>
            <h4>Gastos</h4>
            <p class="inventory-subtitle">${escapeHtml(house.gastos.length)} gastos registrados</p>
          </button>
          <button type="button" class="house-selector-card is-page-link" data-action="nav-mano-obra">
            <p class="inventory-kicker">Sección</p>
            <h4>Mano de obra</h4>
            <p class="inventory-subtitle">${escapeHtml(house.mano_obra.length)} registros</p>
          </button>
        </div>
      </section>
    </article>
  `;
}

async function loadSimulationTree(simulacionId) {
  let simulationDetail = {
    id: simulacionId,
    titulo: `Simulacion #${simulacionId}`,
    descripcion: "",
    configuracion: {},
    ofertas: [],
    timeline: [],
    casas: []
  };

  try {
    const detailPayload = await obtenerDetalleSimulacion(simulacionId);
    simulationDetail = { ...simulationDetail, ...(detailPayload || {}) };
  } catch {
    // Continuamos con endpoints de entregas para no vaciar la UI
    // cuando falla el detalle de simulación.
  }
  const detailHouses = asList(simulationDetail, ["casas", "houses"]);

  const housesRaw = await listarCasasSimulacion(simulacionId).catch((error) => {
    console.warn("[inventory] Error listando casas", {
      simulacionId,
      error: String(error?.message || error)
    });
    return [];
  });
  const listedHouses = asList(housesRaw, ["casas", "houses"]);

  let housesBase = listedHouses.length ? listedHouses : detailHouses;

  if (!housesBase.length) {
    const normalizedOnlyDetail = normalizeSimulation(simulationDetail, simulacionId);
    if (!normalizedOnlyDetail.titulo) {
      normalizedOnlyDetail.titulo = `Simulacion #${simulacionId}`;
    }
    return normalizedOnlyDetail;
  }

  const houses = await Promise.all(housesBase.map(async (houseRaw) => {
    const houseId = houseRaw?.id ?? houseRaw?.casa_id ?? houseRaw?.house_id;
    let planillasRaw = null;
    let planillasError = "";
    try {
      planillasRaw = await listarPlanillasCasa(simulacionId, houseId);
    } catch (error) {
      planillasError = String(error?.message || error);
      console.warn("[inventory] Error listando planillas", {
        simulacionId,
        houseId,
        error: planillasError
      });
      planillasRaw = null;
    }

    const gastosRaw = await listarGastosCasa(simulacionId, houseId).catch((error) => {
      console.warn("[inventory] Error listando gastos", {
        simulacionId,
        houseId,
        error: String(error?.message || error)
      });
      return [];
    });

    const manoObraRaw = await listarManoObraCasa(simulacionId, houseId).catch((error) => {
      console.warn("[inventory] Error listando mano de obra", {
        simulacionId,
        houseId,
        error: String(error?.message || error)
      });
      return [];
    });

    let planillasSource = asList(planillasRaw, ["planillas", "entregas", "items"]);
    if (!planillasSource.length) {
      planillasSource = asList(houseRaw, ["planillas", "entregas", "ordenes", "items"]);
    }
    const planillasRawCount = Array.isArray(planillasSource) ? planillasSource.length : 0;
    const gastos = asList(gastosRaw, ["gastos"]).map(normalizeGasto);
    const mano_obra = asList(manoObraRaw, ["mano-obra", "mano_obra"]).map(normalizeManoObra);

    const planillas = await Promise.all(planillasSource.map(async (planillaRaw) => {
      const planillaId = planillaRaw?.id ?? planillaRaw?.planilla_id;
      const itemsRaw = await listarItemsPlanilla(simulacionId, houseId, planillaId).catch(() => null);
      let itemsSource = asList(itemsRaw, ["items", "detalles"]);
      if (!itemsSource.length) {
        itemsSource = asList(planillaRaw, ["items", "detalles"]);
      }

      const items = await Promise.all(itemsSource.map(async (itemRaw) => {
        const itemId = itemRaw?.id ?? itemRaw?.item_id;
        const materialsRaw = await listarMaterialesItem(simulacionId, houseId, planillaId, itemId).catch(() => null);
        let materialsSource = asList(materialsRaw, ["materiales", "items"]);
        if (!materialsSource.length) {
          materialsSource = asList(itemRaw, ["materiales", "items"]);
        }

        const materiales = await Promise.all(materialsSource.map(async (materialRaw) => {
          const materialId = materialRaw?.id ?? materialRaw?.material_id;
          const movimientosRaw = await listarMovimientosMaterial({
            simulacion_id: simulacionId,
            casa_id: houseId,
            planilla_id: planillaId,
            item_id: itemId,
            material_id: materialId
          }).catch(() => []);

          return normalizeMaterial({
            ...materialRaw,
            movimientos: asList(movimientosRaw, ["movimientos", "items"]).map(normalizeMovimiento)
          });
        }));

        return normalizeItem({ ...itemRaw, materiales });
      }));

      return normalizePlanilla({ ...planillaRaw, items });
    }));

    return normalizeCasa({
      ...houseRaw,
      planillas,
      gastos,
      "mano-obra": mano_obra
    });
  }));

  const normalized = normalizeSimulation({ ...simulationDetail, casas: houses }, simulacionId);

  if (!normalized.titulo) {
    normalized.titulo = `Simulacion #${simulacionId}`;
  }

  return normalized;
}

function buildFallbackSimulation(simulationId, list = []) {
  const source = list.find((item) => normalizeId(item.id) === normalizeId(simulationId)) || {};
  return normalizeSimulation({
    id: normalizeId(simulationId),
    titulo: source.titulo || source.title || `Simulacion #${simulationId}`,
    descripcion: source.descripcion || source.description || "",
    configuracion: source.configuracion || source.parametros || source.payload || {},
    ofertas: source.ofertas || [],
    timeline: source.timeline || [],
    casas: source.casas || []
  }, simulationId);
}

export function initSavedSimulationsWorkspace(options) {
  const {
    dom,
    withUiFeedback,
    getConfig,
    setConfigToForm,
    updateConfigPreview,
    updateMetodologiaUI,
    writeLog,
    setSummary
  } = options;

  const state = {
    list: [],
    activeId: null,
    activeDetail: null,
    selectedHouseId: null,
    selectedPlanillaId: null,
    selectedItemId: null,
    selectedMaterialId: null,
    planView: "root",  // "root" | "houses" | "house" | "planillas" | "planilla" | "items" | "item" | "materiales" | "material" | "resumen"
    searchHousesText: "",
    loading: false
  };

  // Redirigir referencias de DOM a los contenedores de simulaciones guardadas
  const originalDom = { ...dom };
  dom.simulationGlobalSummary = dom.simulationDetailSummary;
  dom.simulationGlobalMaterials = dom.simulationDetailMaterials;
  dom.simulationTimelinePreview = dom.simulationDetailTimeline;
  dom.simulationHousesContainer = dom.simulationDetailHousesContainer;

  const planSection = document.getElementById("plan-simulado");
  let simulationDetailOverview = document.getElementById("simulation-detail-overview");

  function syncPlanFocusMode() {
    if (!planSection) {
      return;
    }

    // Obtener el elemento si aún no lo tenemos
    if (!simulationDetailOverview) {
      simulationDetailOverview = document.getElementById("simulation-detail-overview");
    }

    const isSectionFocused = state.planView !== "root" && state.planView !== "resumen" && state.planView !== "proyeccion";
    planSection.classList.toggle("plan-section-focused", isSectionFocused);
    
    // Mostrar tabla solo en resumen (ocultar en otros views incluyendo proyeccion)
    if (simulationDetailOverview) {
      simulationDetailOverview.style.display = state.planView === "resumen" ? "" : "none";
    }
  }

  function renderPlanBreadcrumb(items) {
    return `
      <nav class="inventory-breadcrumb" aria-label="Recorrido de plan simulado">
        ${items.map((item, index) => {
          const actionAttr = item.action ? `data-action="${item.action}"` : "";
          return `
            <button type="button" class="inventory-breadcrumb-item ${item.current ? "is-current" : ""}" ${actionAttr} ${item.current ? "disabled" : ""}>
              ${escapeHtml(item.label)}
            </button>
            ${index < items.length - 1 ? '<span class="inventory-breadcrumb-sep">/</span>' : ""}
          `;
        }).join("")}
      </nav>
    `;
  }

  function renderHouseSelectorCard(house) {
    return `
      <button class="house-selector-card is-page-link" type="button" data-action="open-house" data-house-id="${escapeHtml(house.id)}">
        <p class="inventory-kicker">Casa #${escapeHtml(house.id)}</p>
        <h4>${escapeHtml(house.adherente_nombre || `Casa ${house.id}`)}</h4>
        <p class="inventory-subtitle">Saldo ${money(house.saldo_ars)} | Materiales ${money(house.total_materiales_ars)} | Gastos ${money(house.total_gastos_ars)}</p>
      </button>
    `;
  }

  function filterHouses(houses, searchText) {
    if (!searchText.trim()) {
      return houses;
    }
    const query = searchText.toLowerCase().trim();
    return houses.filter((house) => {
      const houseId = (house.id || "").toString().toLowerCase();
      const adherenteName = (house.adherente_nombre || "").toLowerCase();
      return houseId.includes(query) || adherenteName.includes(query);
    });
  }

  function updateHousesGrid(casas, searchText) {
    const filteredHouses = filterHouses(casas, searchText);
    const gridContainer = document.querySelector(".house-selector-grid");
    const infoEl = document.querySelector(".inventory-search-info");
    const emptyEl = document.querySelector(".inventory-page-list .inventory-empty");

    if (filteredHouses.length === 0) {
      if (gridContainer) gridContainer.remove();
      if (infoEl) infoEl.remove();
      if (!emptyEl) {
        const newEmptyEl = document.createElement("p");
        newEmptyEl.className = "inventory-empty";
        newEmptyEl.textContent = "No se encontraron casas que coincidan con tu búsqueda.";
        const searchContainer = document.querySelector(".house-search-container");
        if (searchContainer && searchContainer.nextElementSibling) {
          searchContainer.parentNode.insertBefore(newEmptyEl, searchContainer.nextElementSibling);
        }
      }
    } else {
      if (emptyEl) emptyEl.remove();
      
      if (!gridContainer) {
        const newGrid = document.createElement("div");
        newGrid.className = "house-selector-grid";
        const searchContainer = document.querySelector(".house-search-container");
        if (searchContainer) {
          searchContainer.parentNode.insertBefore(newGrid, searchContainer.nextElementSibling);
        }
      }

      const grid = document.querySelector(".house-selector-grid");
      if (grid) {
        grid.innerHTML = filteredHouses.map((house) => renderHouseSelectorCard(house)).join("");
      }

      if (infoEl && filteredHouses.length < casas.length) {
        infoEl.textContent = `${filteredHouses.length} de ${casas.length} casas`;
      } else if (!infoEl && filteredHouses.length < casas.length) {
        const newInfoEl = document.createElement("p");
        newInfoEl.className = "inventory-search-info";
        newInfoEl.textContent = `${filteredHouses.length} de ${casas.length} casas`;
        const searchContainer = document.querySelector(".house-search-container");
        if (searchContainer) {
          searchContainer.appendChild(newInfoEl);
        }
      }
    }
  }

  function getActiveSimulationId() {
    const id = state.activeDetail?.id || state.activeId;
    if (!id) {
      throw new Error("Selecciona una simulacion guardada.");
    }
    return id;
  }

  function updateSummaryLine() {
    if (!dom.simulationsSummary) {
      return;
    }
    // Solo mostrar "Total simulaciones" cuando no hay detalle activo
    if (state.activeDetail) {
      dom.simulationsSummary.textContent = "";
    } else {
      dom.simulationsSummary.textContent = `Total simulaciones: ${state.list.length}`;
    }
  }

  function renderSimulationCard(sim) {
    return `
      <button class="house-selector-card is-page-link" type="button" data-action="open-simulation" data-simulation-id="${escapeHtml(sim.id)}">
        <p class="inventory-kicker">Simulación #${escapeHtml(sim.id)}</p>
        <h4>${escapeHtml(sim.titulo || sim.title || `Simulación ${sim.id}`)}</h4>
        <p class="inventory-subtitle">${escapeHtml(sim.descripcion || sim.description || "Sin descripción")}</p>
      </button>
    `;
  }

  function renderSimulationList() {
    if (!dom.simulationsList) {
      return;
    }

    // Si hay un detalle activo, ocultar el listado
    const workspace = document.querySelector(".simulation-workspace");
    const aside = workspace?.querySelector("aside");
    const article = workspace?.querySelector("article");

    if (state.activeDetail) {
      if (aside) {
        aside.style.display = "none";
      }
      if (article) {
        article.style.display = "block";
      }
      if (workspace) {
        workspace.style.gridTemplateColumns = "1fr";
      }
      return;
    }

    // Mostrar grid de simulaciones
    if (aside) {
      aside.style.display = "block";
    }
    if (article) {
      article.style.display = "none";
    }
    if (workspace) {
      workspace.style.gridTemplateColumns = "minmax(250px, 340px) 1fr";
    }

    if (state.list.length === 0) {
      dom.simulationsList.innerHTML = '<p class="inventory-empty">No hay simulaciones guardadas.</p>';
      return;
    }

    dom.simulationsList.innerHTML = `
      <div class="house-selector-grid">
        ${state.list.map((sim) => renderSimulationCard(sim)).join("")}
      </div>
    `;
  }

  function renderSummaryCards(summary) {
    if (!dom.simulationGlobalSummary) {
      return;
    }

    dom.simulationGlobalSummary.innerHTML = `
      <article class="plan-summary-card"><p>Casas</p><h4>${summary.casas}</h4></article>
      <article class="plan-summary-card"><p>Planillas</p><h4>${summary.planillas}</h4></article>
      <article class="plan-summary-card"><p>Items</p><h4>${summary.items}</h4></article>
      <article class="plan-summary-card"><p>Materiales</p><h4>${summary.materiales}</h4></article>
      <article class="plan-summary-card"><p>Movimientos</p><h4>${summary.movimientos}</h4></article>
      <article class="plan-summary-card"><p>Gastos</p><h4>${summary.gastos}</h4></article>
      <article class="plan-summary-card"><p>Total materiales</p><h4>${money(summary.totalMateriales)}</h4></article>
      <article class="plan-summary-card"><p>Saldo total</p><h4>${money(summary.totalSaldo)}</h4></article>
    `;
  }

  function renderTimelineTable(rows) {
    if (!dom.simulationGlobalMaterials) {
      return;
    }

    // Actualizar título y headers
    const tableTitle = document.getElementById("simulation-detail-table-title");
    if (tableTitle) {
      tableTitle.textContent = "Timeline mensual de proyección";
    }
    const tableHead = document.getElementById("simulation-detail-table-head");
    if (tableHead) {
      tableHead.innerHTML = `
        <tr>
          <th>Mes</th>
          <th>Cuota completa</th>
          <th>Media cuota</th>
          <th>Adherentes activos</th>
          <th>En construcción</th>
          <th>Ingreso mes</th>
          <th>Egreso mes</th>
          <th>Fondo cierre</th>
          <th>Evento</th>
        </tr>
      `;
    }

    if (!rows.length) {
      dom.simulationGlobalMaterials.innerHTML = '<tr><td colspan="9">Sin datos de timeline en la proyección.</td></tr>';
      return;
    }

    dom.simulationGlobalMaterials.innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.mes ?? "-")}</td>
        <td>${money(row.cuota_completa_mes_ars ?? 0)}</td>
        <td>${money(row.media_cuota_mes_ars ?? 0)}</td>
        <td>${escapeHtml(row.adherentes_activos ?? 0)}</td>
        <td>${escapeHtml(row.adherentes_en_construccion ?? 0)}</td>
        <td>${money(row.ingreso_mes_ars ?? 0)}</td>
        <td>${money(row.egreso_mes_ars ?? 0)}</td>
        <td>${money(row.fondo_cierre_ars ?? 0)}</td>
        <td>${escapeHtml(row.evento_mes ?? "-")}</td>
      </tr>
    `).join("");
  }

  function renderGlobalMaterials(summary) {
    if (!dom.simulationGlobalMaterials) {
      return;
    }

    // Actualizar título y headers
    const tableTitle = document.getElementById("simulation-detail-table-title");
    if (tableTitle) {
      tableTitle.textContent = "Materiales globales agrupados";
    }
    const tableHead = document.getElementById("simulation-detail-table-head");
    if (tableHead) {
      tableHead.innerHTML = `
        <tr>
          <th>Material</th>
          <th>Unidad</th>
          <th>Total</th>
          <th>Retirado</th>
          <th>En construcción</th>
          <th>Total ARS</th>
        </tr>
      `;
    }

    if (!summary.materialesAgrupados.length) {
      dom.simulationGlobalMaterials.innerHTML = '<tr><td colspan="6">Sin materiales cargados.</td></tr>';
      return;
    }

    dom.simulationGlobalMaterials.innerHTML = summary.materialesAgrupados.map((material) => `
      <tr>
        <td>${escapeHtml(material.nombre)}</td>
        <td>${escapeHtml(material.unidad)}</td>
        <td>${escapeHtml(material.cantidad_total)}</td>
        <td>${escapeHtml(material.cantidad_retirada)}</td>
        <td>${escapeHtml(material.cantidad_en_construccion)}</td>
        <td>${money(material.total_ars)}</td>
      </tr>
    `).join("");
  }

  function renderTimelinePreview(rows) {
    if (!dom.simulationTimelinePreview) {
      return;
    }

    if (!rows.length) {
      dom.simulationTimelinePreview.innerHTML = '<tr><td colspan="4">Sin timeline en esta simulación.</td></tr>';
      return;
    }

    dom.simulationTimelinePreview.innerHTML = rows.slice(0, 24).map((row) => `
      <tr>
        <td>${escapeHtml(row.mes ?? "-")}</td>
        <td>${escapeHtml(row.evento ?? row.evento_mes ?? "-")}</td>
        <td>${money(row.ingreso_mes_ars ?? row.ingreso_mes ?? 0)}</td>
        <td>${money(row.fondo_cierre_ars ?? row.fondo_ars ?? row.fondo ?? 0)}</td>
      </tr>
    `).join("");
  }

  function renderProjectionTab(proyeccion) {
    if (!proyeccion) {
      if (dom.simulationGlobalSummary) {
        dom.simulationGlobalSummary.innerHTML = '<p class="inventory-empty">No hay proyección disponible para esta simulación.</p>';
      }
      return;
    }

    const resumen = proyeccion.resumen || {};
    const timeline = proyeccion.timeline || [];

    // Renderizar KPIs de proyección
    if (dom.simulationGlobalSummary) {
      dom.simulationGlobalSummary.innerHTML = `
        <article class="plan-summary-card"><p>Horizonte</p><h4>${resumen.horizonte_meses ?? "-"} meses</h4></article>
        <article class="plan-summary-card"><p>Valor vivienda</p><h4>${money(resumen.valor_vivienda_ars ?? 0)}</h4></article>
        <article class="plan-summary-card"><p>Fondo inicial</p><h4>${money(resumen.fondo_inicial_ars ?? 0)}</h4></article>
        <article class="plan-summary-card"><p>Fondo final</p><h4>${money(resumen.fondo_final_ars ?? 0)}</h4></article>
        <article class="plan-summary-card"><p>Casas iniciadas</p><h4>${resumen.casas_iniciadas_total ?? 0}</h4></article>
        <article class="plan-summary-card"><p>Casas finalizadas</p><h4>${resumen.casas_finalizadas_total ?? 0}</h4></article>
        <article class="plan-summary-card"><p>Ingreso total</p><h4>${money(resumen.ingreso_total_ars ?? 0)}</h4></article>
        <article class="plan-summary-card"><p>Egreso total</p><h4>${money(resumen.egreso_total_ars ?? 0)}</h4></article>
      `;
    }

    // Actualizar título y headers de tabla
    const tableTitle = document.getElementById("simulation-detail-table-title");
    if (tableTitle) {
      tableTitle.textContent = "Timeline de proyección (por mes)";
    }
    const tableHead = document.getElementById("simulation-detail-table-head");
    if (tableHead) {
      tableHead.innerHTML = `
        <tr>
          <th>Mes</th>
          <th>Cuota completa</th>
          <th>Media cuota</th>
          <th>Adherentes activos</th>
          <th>En construcción</th>
          <th>Ingreso mes</th>
          <th>Egreso mes</th>
          <th>Fondo cierre</th>
          <th>Evento</th>
        </tr>
      `;
    }

    // Renderizar timeline en tabla
    if (dom.simulationGlobalMaterials && timeline.length) {
      dom.simulationGlobalMaterials.innerHTML = timeline.map((row) => `
        <tr>
          <td>${escapeHtml(row.mes ?? "-")}</td>
          <td>${money(row.cuota_completa_mes_ars ?? 0)}</td>
          <td>${money(row.media_cuota_mes_ars ?? 0)}</td>
          <td>${escapeHtml(row.adherentes_activos ?? 0)}</td>
          <td>${escapeHtml(row.adherentes_en_construccion ?? 0)}</td>
          <td>${money(row.ingreso_mes_ars ?? 0)}</td>
          <td>${money(row.egreso_mes_ars ?? 0)}</td>
          <td>${money(row.fondo_cierre_ars ?? 0)}</td>
          <td>${escapeHtml(row.evento_mes ?? "-")}</td>
        </tr>
      `).join("");
    } else if (dom.simulationGlobalMaterials) {
      dom.simulationGlobalMaterials.innerHTML = '<tr><td colspan="9">Sin datos de timeline en la proyección.</td></tr>';
    }
  }

  function renderHouses(detail) {
    if (!dom.simulationHousesContainer) {
      return;
    }

    // Si estamos en resumen o proyección, renderizar esas vistas aunque no haya casas
    if (state.planView === "resumen" && detail) {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      const summary = buildSummary(detail);
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Simulación actual", action: "nav-root" },
          { label: "Resumen", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Resumen de la simulación</h4>
          <button class="btn btn-ghost" type="button" data-action="back-to-root">Volver</button>
        </div>
        </section>
      `;
      renderSummaryCards(summary);
      renderGlobalMaterials(summary);
      return;
    }

    // Vista de proyección: mostrar timeline
    if (state.planView === "proyeccion") {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Simulación actual", action: "nav-root" },
          { label: "Proyección", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Proyección de la simulación</h4>
          <button class="btn btn-ghost" type="button" data-action="back-to-root">Volver</button>
        </div>
        </section>
      `;
      
      // Renderizar tabla de proyección si los datos están disponibles
      if (state.simulationProyeccion) {
        renderTimelineTable(state.simulationProyeccion.timeline || []);
      }
      return;
    }

    if (!detail?.casas?.length) {
      state.selectedHouseId = null;
      state.planView = "root";
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.remove("hidden");
      dom.simulationHousesContainer.innerHTML = '<p class="inventory-empty">Esta simulación todavía no tiene casas cargadas.</p>';
      return;
    }

    const selectedHouseId = normalizeId(state.selectedHouseId);
    const selectedHouse = detail.casas.find((house) => normalizeId(house.id) === selectedHouseId);

    if (state.planView === "house" && !selectedHouse) {
      state.planView = "houses";
      state.selectedHouseId = null;
    }

    // Renderizar summary cards solo si estamos en root
    // Vista raíz: mostrar secciones del plan
    if (state.planView === "root") {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.remove("hidden");
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Simulación actual", action: "nav-root" }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Secciones del plan</h4>
        </div>
        <div class="house-selector-grid">
          <button type="button" class="house-selector-card" data-action="open-simulation-section" data-section="resumen">
            <p class="inventory-kicker">SECCIÓN</p>
            <h4>Resumen</h4>
            <p class="inventory-subtitle">KPIs y datos generales de la simulación</p>
          </button>
          <button type="button" class="house-selector-card" data-action="open-simulation-section" data-section="proyeccion">
            <p class="inventory-kicker">SECCIÓN</p>
            <h4>Proyección</h4>
            <p class="inventory-subtitle">Timeline mensual y datos de proyección</p>
          </button>
          <button type="button" class="house-selector-card" data-action="open-houses-section">
            <p class="inventory-kicker">SECCIÓN</p>
            <h4>Casas</h4>
            <p class="inventory-subtitle">${detail.casas?.length ?? 0} casas registradas</p>
          </button>
        </div>
        </section>
      `;
      // Limpiar KPIs en root
      if (dom.simulationGlobalSummary) {
        dom.simulationGlobalSummary.innerHTML = '';
      }
      return;
    }

    if (state.planView === "house" && selectedHouse) {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      dom.houseCreateForm?.classList.add("hidden");
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-detail">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Casa seleccionada</h4>
          <button class="btn btn-ghost" type="button" data-action="back-to-houses">Volver a casas</button>
        </div>
        <p class="inventory-page-subtitle">${escapeHtml(selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`)}</p>
        ${renderHouse(selectedHouse, { simulacionId: detail.id })}
        </section>
      `;
      return;
    }

    // Vista jerárquica: Planillas
    if (state.planView === "planillas" && selectedHouse) {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      const planillas = safeArray(selectedHouse.planillas);
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, action: "open-house" },
          { label: "Planillas", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Planillas de la casa</h4>
          <div>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-planilla">Agregar planilla</button>
            <button class="btn btn-ghost" type="button" data-action="back-to-house">Volver a casa</button>
          </div>
        </div>
        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-3 hidden" data-action="create-planilla" data-simulacion-id="${escapeHtml(state.activeDetail.id)}" data-casa-id="${escapeHtml(selectedHouse.id)}">
          ${inputField("Número", "numero", "")}
          ${inputField("Fecha", "fecha", new Date().toISOString().slice(0, 10), "date")}
          ${inputField("Vencimiento", "vencimiento", "", "date")}
          ${inputField("Proveedor", "proveedor", "")}
          ${inputField("Contratista", "contratista", "")}
          ${inputField("Adherente", "adherente", selectedHouse.adherente_nombre)}
          ${inputField("Dirección", "direccion", "")}
          ${textAreaField("Observaciones", "observaciones", "", 2)}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-primary" type="submit">Crear planilla</button>
          </div>
        </form>
        <p class="inventory-page-subtitle">${escapeHtml(selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`)}</p>
        ${planillas.length === 0 ? '<p class="inventory-empty">Sin planillas cargadas.</p>' : `
          <div class="house-selector-grid">
            ${planillas.map((p) => `
              <button type="button" class="house-selector-card" data-action="open-planilla" data-planilla-id="${escapeHtml(p.id)}">
                <p class="inventory-kicker">Planilla #${escapeHtml(p.numero || p.id)}</p>
                <h4>${escapeHtml(p.proveedor || p.contratista || "Sin proveedor")}</h4>
                <p class="inventory-subtitle">Items: ${escapeHtml(safeArray(p.items).length)} | Monto: ${money(p.total_materiales_ars)}</p>
              </button>
            `).join('')}
          </div>
        `}
        </section>
      `;
      return;
    }

    // Vista jerárquica: Items
    if (state.planView === "items" && selectedHouse) {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      const houseItems = selectedHouse.planillas.flatMap((planilla) =>
        safeArray(planilla.items).map((item) => ({
          planilla,
          item
        }))
      );
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, action: "open-house" },
          { label: "Items", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Items de la casa</h4>
          <div>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-item">Agregar item</button>
            <button class="btn btn-ghost" type="button" data-action="back-to-house">Volver a casa</button>
          </div>
        </div>
        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-3 hidden" data-action="create-item" data-simulacion-id="${escapeHtml(state.activeDetail.id)}" data-casa-id="${escapeHtml(selectedHouse.id)}">
          <label>
            Planilla destino
            <select name="planilla_id" required>
              <option value="">Seleccionar...</option>
              ${selectedHouse.planillas.map((planilla) => `<option value="${escapeHtml(planilla.id)}">${escapeHtml(`Planilla ${planilla.numero || planilla.id}`)}</option>`).join("")}
            </select>
          </label>
          ${inputField("Nombre", "nombre", "")}
          ${inputField("Proveedor", "proveedor", "")}
          ${inputField("Descripción", "descripcion", "")}
          ${inputField("Orden", "orden", 1, "number", "step=1")}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-primary" type="submit">Agregar item</button>
          </div>
        </form>
        <p class="inventory-page-subtitle">Todos los items de todas las planillas</p>
        ${houseItems.length === 0 ? '<p class="inventory-empty">Sin items cargados.</p>' : `
          <div class="house-selector-grid">
            ${houseItems.map(({ planilla, item }) => `
              <button type="button" class="house-selector-card" data-action="open-item" data-item-id="${escapeHtml(item.id)}">
                <p class="inventory-kicker">Planilla ${escapeHtml(planilla.numero || planilla.id)}</p>
                <h4>${escapeHtml(item.nombre)}</h4>
                <p class="inventory-subtitle">Materiales: ${escapeHtml(safeArray(item.materiales).length)} | Monto: ${money(item.total_materiales_ars)}</p>
              </button>
            `).join('')}
          </div>
        `}
        </section>
      `;
      return;
    }

    // Vista jerárquica: Materiales consolidados
    if (state.planView === "materiales" && selectedHouse) {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      const allMateriales = selectedHouse.planillas.flatMap((planilla) =>
        safeArray(planilla.items).flatMap((item) =>
          safeArray(item.materiales).map((material) => ({
            planilla,
            item,
            material
          }))
        )
      );
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, action: "open-house" },
          { label: "Materiales", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Materiales de la casa</h4>
          <div>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-material-direct">Agregar material</button>
            <button class="btn btn-ghost" type="button" data-action="back-to-house">Volver a casa</button>
          </div>
        </div>
        <p class="inventory-page-subtitle">Vista consolidada de todos los materiales</p>
        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-3 hidden" data-action="create-material-direct" data-simulacion-id="${escapeHtml(state.activeDetail.id)}" data-casa-id="${escapeHtml(selectedHouse.id)}">
          <label>
            Planilla e Item destino
            <select name="target" required>
              <option value="">Seleccionar...</option>
              ${selectedHouse.planillas.flatMap((planilla) => 
                safeArray(planilla.items).map((item) => 
                  `<option value="${escapeHtml(planilla.id)}::${escapeHtml(item.id)}">Planilla ${escapeHtml(planilla.numero || planilla.id)} - Item ${escapeHtml(item.nombre)}</option>`
                )
              ).join("")}
            </select>
          </label>
          ${inputField("Nombre", "nombre", "")}
          ${inputField("Unidad", "unidad", "u")}
          ${inputField("Proveedor", "proveedor", "")}
          ${inputField("Descripción", "descripcion", "")}
          ${inputField("Cantidad total", "cantidad_total", 0, "number", "min=0 step=0.01")}
          ${inputField("Cantidad retirada", "cantidad_retirada", 0, "number", "min=0 step=0.01")}
          ${inputField("Cantidad en construcción", "cantidad_en_construccion", 0, "number", "min=0 step=0.01")}
          ${inputField("Precio unitario ARS", "precio_unitario_ars", 0, "number", "min=0 step=0.01")}
          ${textAreaField("Nota", "nota", "", 2)}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-primary" type="submit">Agregar material</button>
          </div>
        </form>
        ${allMateriales.length === 0 ? '<p class="inventory-empty">Sin materiales cargados.</p>' : `
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
              <thead>
                <tr style="background:#f0f0f0;border-bottom:2px solid #ccc;">
                  <th style="padding:8px;text-align:left;">Planilla</th>
                  <th style="padding:8px;text-align:left;">Item</th>
                  <th style="padding:8px;text-align:left;">Material</th>
                  <th style="padding:8px;text-align:right;">Cantidad</th>
                  <th style="padding:8px;text-align:right;">Precio Unit.</th>
                  <th style="padding:8px;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${allMateriales.map(({ planilla, item, material }) => `
                  <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px;">${escapeHtml(planilla.numero || planilla.id)}</td>
                    <td style="padding:8px;">${escapeHtml(item.nombre)}</td>
                    <td style="padding:8px;"><strong>${escapeHtml(material.nombre)}</strong>${material.proveedor ? ` (${escapeHtml(material.proveedor)})` : ''}</td>
                    <td style="padding:8px;text-align:right;">${escapeHtml(material.cantidad_total)} ${escapeHtml(material.unidad)}</td>
                    <td style="padding:8px;text-align:right;">${money(material.precio_unitario_ars)}</td>
                    <td style="padding:8px;text-align:right;"><strong>${money(material.total_ars)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
        </section>
      `;
      return;
    }

    // Vista jerárquica: Gastos
    if (state.planView === "gastos" && selectedHouse) {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      const gastos = safeArray(selectedHouse.gastos);
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, action: "open-house" },
          { label: "Gastos", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Gastos de la casa</h4>
          <div>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-gasto">Agregar gasto</button>
            <button class="btn btn-ghost" type="button" data-action="back-to-house">Volver a casa</button>
          </div>
        </div>
        <p class="inventory-page-subtitle">Total de gastos: ${money(selectedHouse.total_gastos_ars)}</p>
        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-2 hidden" data-action="create-gasto" data-simulacion-id="${escapeHtml(state.activeDetail.id)}" data-casa-id="${escapeHtml(selectedHouse.id)}">
          ${inputField("Nombre", "nombre", "")}
          ${inputField("Monto ARS", "monto_ars", 0, "number", "min=0 step=0.01")}
          ${textAreaField("Descripción", "descripcion", "", 2)}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-primary" type="submit">Agregar gasto</button>
          </div>
        </form>
        ${gastos.length === 0 ? '<p class="inventory-empty">Sin gastos cargados.</p>' : `
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
              <thead>
                <tr style="background:#f0f0f0;border-bottom:2px solid #ccc;">
                  <th style="padding:8px;text-align:left;">Nombre</th>
                  <th style="padding:8px;text-align:left;">Descripción</th>
                  <th style="padding:8px;text-align:right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${gastos.map((gasto) => `
                  <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px;"><strong>${escapeHtml(gasto.nombre)}</strong></td>
                    <td style="padding:8px;">${escapeHtml(gasto.descripcion)}</td>
                    <td style="padding:8px;text-align:right;">${money(gasto.monto_ars)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
        </section>
      `;
      return;
    }

    // Vista de mano de obra
    if (state.planView === "mano-obra" && selectedHouse) {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      const mano_obra = safeArray(selectedHouse.mano_obra);
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, action: "open-house" },
          { label: "Mano de obra", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Mano de obra de la casa</h4>
          <div>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-mano-obra">Agregar</button>
            <button class="btn btn-ghost" type="button" data-action="back-to-house">Volver a casa</button>
          </div>
        </div>
        <p class="inventory-page-subtitle">Total: ${money(selectedHouse.total_mano_obra_ars)}</p>
        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-2 hidden" data-action="create-mano-obra" data-simulacion-id="${escapeHtml(state.activeDetail.id)}" data-casa-id="${escapeHtml(selectedHouse.id)}">
          ${inputField("Rubro", "rubro", "")}
          <fieldset style="border:none;padding:0;margin:0;">
            <legend style="font-size:0.9rem;margin-bottom:0.5rem;">Tipo de mano de obra</legend>
            <label style="display:inline-flex;align-items:center;gap:0.5rem;margin-right:1rem;">
              <input type="radio" name="mano_obra_tipo" value="monto" checked />
              Monto fijo
            </label>
            <label style="display:inline-flex;align-items:center;gap:0.5rem;">
              <input type="radio" name="mano_obra_tipo" value="porcentaje" />
              Porcentaje
            </label>
          </fieldset>
          <div id="campo-monto-ars" style="grid-column:1/-1;">
            ${inputField("Monto ARS", "monto_ars", 0, "number", "min=0 step=0.01")}
          </div>
          <div id="campo-porcentaje" style="grid-column:1/-1;display:none;">
            ${inputField("Porcentaje (%)", "porcentaje", 0, "number", "min=0 max=100 step=0.01")}
          </div>
          ${inputField("Fecha", "fecha", new Date().toISOString().split('T')[0], "date")}
          ${textAreaField("Descripción", "descripcion", "", 2)}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-primary" type="submit">Agregar</button>
          </div>
        </form>
        ${mano_obra.length === 0 ? '<p class="inventory-empty">Sin registros de mano de obra.</p>' : `
          <div style="display:flex;flex-direction:column;gap:0.7rem;">
            ${mano_obra.map((mo) => renderManoObra(mo, { simulacionId: state.activeDetail.id, casaId: selectedHouse.id })).join('')}
          </div>
        `}
        </section>
      `;
      return;
    }

    if (state.planView === "houses") {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.remove("hidden");
      const filteredHouses = filterHouses(detail.casas, state.searchHousesText);
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Casas de la simulación</h4>
          <button class="btn btn-primary" type="button" data-action="toggle-create-house">Agregar casa</button>
        </div>
        <p class="inventory-page-subtitle">Elegí una casa para abrir su detalle completo.</p>
        
        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-4 hidden" data-action="create-house" data-simulacion-id="${escapeHtml(state.activeDetail.id)}">
          <input type="number" name="adherente_id" min="1" step="1" placeholder="ID del adherente (opcional)" />
          <input type="text" name="adherente_nombre" placeholder="Nombre del adherente" required />
          <input type="number" name="precio_ars" min="0" step="0.01" placeholder="Precio ARS" required />
          <input type="text" name="descripcion" placeholder="Descripción de la casa" />
          <button class="btn btn-secondary" type="submit">Guardar casa</button>
          <button class="btn btn-ghost" type="button" data-action="toggle-create-house">Cancelar</button>
        </form>
        
        <div class="house-search-container">
          <input 
            type="text" 
            class="house-search-input" 
            id="house-search-input"
            placeholder="Buscar por número de casa o adherente..."
            value="${escapeHtml(state.searchHousesText)}"
          />
          ${filteredHouses.length < detail.casas.length ? `<p class="inventory-search-info">${filteredHouses.length} de ${detail.casas.length} casas</p>` : ""}
        </div>
        ${filteredHouses.length === 0 
          ? '<p class="inventory-empty">No se encontraron casas que coincidan con tu búsqueda.</p>'
          : `<div class="house-selector-grid">
              ${filteredHouses.map((house) => renderHouseSelectorCard(house)).join("")}
            </div>`
        }
        </section>
      `;
      
      // Agregar event listener al input de búsqueda
      const searchInput = document.getElementById("house-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          state.searchHousesText = e.target.value;
          updateHousesGrid(detail.casas, state.searchHousesText);
        });
        searchInput.focus();
      }
      return;
    }

    // Vista detalle: Planilla específica
    if (state.planView === "planilla" && selectedHouse) {
      const planillaId = normalizeId(state.selectedPlanillaId);
      const planilla = safeArray(selectedHouse.planillas).find((p) => normalizeId(p.id) === planillaId);
      if (!planilla) {
        state.planView = "planillas";
        renderHouses(state.activeDetail);
        return;
      }
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-detail">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, action: "open-house" },
          { label: "Planillas", action: "nav-planillas" },
          { label: `Planilla #${escapeHtml(planilla.numero || planilla.id)}`, current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Planilla #${escapeHtml(planilla.numero || planilla.id)}</h4>
          <button class="btn btn-ghost" type="button" data-action="back-to-planillas">Volver a planillas</button>
        </div>
        <p class="inventory-page-subtitle">${escapeHtml(planilla.proveedor || planilla.contratista || "Sin proveedor")}</p>
        ${renderPlanilla(planilla, { simulacionId: state.activeDetail.id, casaId: selectedHouse.id })}
        </section>
      `;
      return;
    }

    // Vista detalle: Item específico
    if (state.planView === "item" && selectedHouse) {
      const itemId = normalizeId(state.selectedItemId);
      let itemData = null;
      let planillaData = null;
      for (const planilla of safeArray(selectedHouse.planillas)) {
        const found = safeArray(planilla.items).find((i) => normalizeId(i.id) === itemId);
        if (found) {
          itemData = found;
          planillaData = planilla;
          break;
        }
      }
      if (!itemData) {
        state.planView = "items";
        renderHouses(state.activeDetail);
        return;
      }
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.add("hidden");
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-detail">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", action: "nav-houses" },
          { label: selectedHouse.adherente_nombre || `Casa #${selectedHouse.id}`, action: "open-house" },
          { label: "Items", action: "nav-items" },
          { label: escapeHtml(itemData.nombre), current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">${escapeHtml(itemData.nombre)}</h4>
          <button class="btn btn-ghost" type="button" data-action="back-to-items">Volver a items</button>
        </div>
        <p class="inventory-page-subtitle">Planilla #${escapeHtml(planillaData.numero || planillaData.id)} | Proveedor: ${escapeHtml(itemData.proveedor)}</p>
        ${renderItem(itemData, { simulacionId: state.activeDetail.id, casaId: selectedHouse.id, planillaId: planillaData.id })}
        </section>
      `;
      return;
    }

    state.selectedHouseId = null;
    state.planView = "root";
    syncPlanFocusMode();
    dom.buttonAddHouse?.classList.add("hidden");
    dom.houseCreateForm?.classList.add("hidden");

    dom.simulationHousesContainer.innerHTML = `
      <section class="inventory-page inventory-page-root">
      ${renderPlanBreadcrumb([{ label: "Simulacion actual", current: true }])}
      <div class="inventory-drilldown-head">
        <h4 class="inventory-page-title">Secciones del plan</h4>
      </div>
      <div class="inventory-section-grid">
        <button type="button" class="house-selector-card is-page-link" data-action="open-houses-section">
          <p class="inventory-kicker">Sección</p>
          <h4>Casas</h4>
          <p class="inventory-subtitle">${detail.casas.length} casas registradas</p>
        </button>
      </div>
      </section>
    `;
  }

  function renderDetail() {
    if (!state.activeDetail) {
      state.planView = "root";
      syncPlanFocusMode();
      if (dom.simulationDetailTitle) {
        dom.simulationDetailTitle.textContent = "Ninguna simulación seleccionada";
      }
      if (dom.simulationDetailMeta) {
        dom.simulationDetailMeta.innerHTML = "";
      }
      if (dom.simulationGlobalSummary) {
        dom.simulationGlobalSummary.innerHTML = '';
      }
      if (dom.simulationGlobalMaterials) {
        dom.simulationGlobalMaterials.innerHTML = '';
      }
      if (dom.simulationTimelinePreview) {
        dom.simulationTimelinePreview.innerHTML = '';
      }
      if (dom.simulationHousesContainer) {
        dom.simulationHousesContainer.innerHTML = '';
      }
      // Ocultar tabs cuando no hay simulación seleccionada
      const tabsElement = document.getElementById("simulation-tabs");
      if (tabsElement) {
        tabsElement.style.display = "none";
      }
      return;
    }

    if (dom.simulationDetailTitle) {
      const updated = state.activeDetail.updated_at ? new Date(state.activeDetail.updated_at).toLocaleString("es-AR") : "sin fecha";
      dom.simulationDetailTitle.innerHTML = `
        <div class="simulation-detail-title-row">
          <span>Simulación: ${state.activeDetail.titulo || `#${state.activeDetail.id}`}</span>
          <span class="simulation-detail-meta-inline">ID ${state.activeDetail.id} | Última actualización: ${updated}</span>
        </div>
      `;
    }

    if (dom.simulationDetailMeta) {
      const breadcrumb = `
        <button type="button" class="btn btn-ghost" data-action="back-to-simulations">
          ← Volver a simulaciones
        </button>
      `;
      dom.simulationDetailMeta.innerHTML = breadcrumb;
    }

    // renderHouses() maneja todo el contenido según state.planView
    renderHouses(state.activeDetail);
  }

  async function loadSimulationResumen(simulacionId) {
    try {
      const response = await fetch(`/planes/simulaciones/${simulacionId}/resumen`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn("[inventory] Error cargando resumen", { simulacionId, error: String(error?.message || error) });
      return null;
    }
  }

  async function loadSimulationProyeccion(simulacionId) {
    try {
      const response = await fetch(`/planes/simulaciones/${simulacionId}/proyeccion`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn("[inventory] Error cargando proyección", { simulacionId, error: String(error?.message || error) });
      return null;
    }
  }

  async function loadDetail(simulationId, silent = false) {
    state.loading = true;
    const normalizedSimulationId = normalizeId(simulationId);
    let graph;

    try {
      graph = await loadSimulationTree(normalizedSimulationId);
    } catch (error) {
      graph = buildFallbackSimulation(normalizedSimulationId, state.list);
      writeLog(dom.systemLog, "Error cargar detalle simulación", {
        simulacion_id: normalizedSimulationId,
        error: String(error?.message || error)
      });
      if (!silent) {
        setSummary(dom.simSummary, "No se pudo cargar el detalle completo. Mostrando datos parciales.");
      }
    }

    state.activeId = normalizeId(graph.id || normalizedSimulationId);
    state.activeDetail = graph;
    if (!graph.casas?.some((house) => normalizeId(house.id) === normalizeId(state.selectedHouseId))) {
      state.selectedHouseId = null;
    }

    renderSimulationList();
    updateSummaryLine();
    renderDetail();

    if (!silent) {
      setSummary(dom.simSummary, `Simulación ${graph.titulo} cargada.`);
    }

    // Cargar resumen y proyección en paralelo
    Promise.all([
      loadSimulationResumen(normalizedSimulationId),
      loadSimulationProyeccion(normalizedSimulationId)
    ]).then(([resumen, proyeccion]) => {
      state.simulationResumen = resumen;
      state.simulationProyeccion = proyeccion;
      // Re-renderizar si estamos en resumen o proyección
      if (state.planView === "resumen" || state.planView === "proyeccion") {
        renderHouses(state.activeDetail);
      }
    });

    state.loading = false;
    return graph;
  }

  async function refreshList(options = {}) {
    const { silent = false } = options;
    const payload = await listarSimulacionesGuardadas();
    state.list = asList(payload, ["simulaciones"]).map((item) => ({
      ...item,
      id: normalizeId(item.id ?? item.simulacion_id ?? item.snapshot_id)
    })).filter((item) => item.id != null);

    // No cargar automáticamente la primera simulación
    // Dejar que el usuario elija cuál simulación ver haciendo click en una tarjeta
    const activeExists = state.list.some((item) => normalizeId(item.id) === normalizeId(state.activeId));
    if (!activeExists) {
      state.activeId = null;
      state.activeDetail = null;
      state.selectedHouseId = null;
      state.planView = "root";
    }

    renderSimulationList();
    updateSummaryLine();
    renderDetail();

    if (!silent) {
      setSummary(dom.simSummary, `Listado de simulaciones actualizado (${state.list.length}).`);
    }
  }

  async function createSimulation(event) {
    event.preventDefault();
    const data = new FormData(dom.simulationCreateForm);
    const titulo = String(data.get("titulo") || "").trim();
    const descripcion = String(data.get("descripcion") || "").trim();

    if (!titulo || !descripcion) {
      throw new Error("Completa título y descripción.");
    }

    const configuracion = getConfig(dom.form);
    const payload = await crearSimulacionGuardada({ titulo, descripcion, configuracion, ofertas: [] });
    const newId = normalizeId(payload?.id ?? payload?.simulacion_id ?? payload?.snapshot_id);

    dom.simulationCreateForm.reset();
    await refreshList({ silent: true });
    if (newId) {
      await loadDetail(newId, true);
    }
    setSummary(dom.simSummary, "Simulación creada correctamente.");
    writeLog(dom.systemLog, "Crear simulación", payload);
  }

  async function saveSimulation() {
    const simulationId = getActiveSimulationId();
    const payload = await actualizarSimulacionGuardada(simulationId, {
      titulo: String(dom.simulationTitleInput?.value || "").trim(),
      descripcion: String(dom.simulationDescriptionInput?.value || "").trim(),
      configuracion: getConfig(dom.form),
      ofertas: state.activeDetail?.ofertas || []
    });

    await loadDetail(simulationId, true);
    await refreshList({ silent: true });
    setSummary(dom.simSummary, "Cambios guardados en la simulación.");
    writeLog(dom.systemLog, "Guardar simulación", payload);
  }

  async function saveSnapshot() {
    const simulationId = getActiveSimulationId();
    const payload = await actualizarSimulacionGuardada(simulationId, {
      configuracion: getConfig(dom.form),
      ofertas: state.activeDetail?.ofertas || [],
      snapshot: true
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, "Snapshot guardado correctamente.");
    writeLog(dom.systemLog, "Guardar snapshot", payload);
  }

  async function cloneSimulation() {
    const simulationId = getActiveSimulationId();
    const name = window.prompt("Título de la nueva versión", `${state.activeDetail?.titulo || "Simulación"} (copia)`);
    if (!name) {
      return;
    }

    const payload = await clonarSimulacionGuardada(simulationId, { titulo: name });
    const newId = normalizeId(payload?.id ?? payload?.simulacion_id ?? payload?.snapshot_id);
    await refreshList({ silent: true });
    if (newId) {
      await loadDetail(newId, true);
    }
    setSummary(dom.simSummary, "Se clonó la simulación como nueva versión.");
    writeLog(dom.systemLog, "Clonar simulación", payload);
  }

  async function recalculateSimulation() {
    const simulationId = getActiveSimulationId();
    const payload = await recalcularSimulacionGuardada(simulationId, {
      configuracion: getConfig(dom.form),
      ofertas: state.activeDetail?.ofertas || []
    });

    await loadDetail(simulationId, true);
    setSummary(dom.simSummary, "Simulación recalculada con la configuración actual.");
    writeLog(dom.systemLog, "Recalcular simulación", payload);
  }

  function readActionContext(form) {
    return {
      simulacionId: form.dataset.simulacionId || getActiveSimulationId(),
      casaId: form.dataset.casaId || null,
      planillaId: form.dataset.planillaId || null,
      itemId: form.dataset.itemId || null,
      materialId: form.dataset.materialId || null,
      gastoId: form.dataset.gastoId || null,
      manoObraId: form.dataset.manoObraId || null
    };
  }

  function readFormPayload(form) {
    const data = new FormData(form);
    const payload = {};
    data.forEach((value, key) => {
      if (form.querySelector(`input[name="${key}"][type="number"], input[name="${key}"][type="date"]`)) {
        const parsed = Number(value);
        payload[key] = Number.isFinite(parsed) ? parsed : value;
      } else {
        payload[key] = value;
      }
    });

    const checkboxNames = Array.from(form.querySelectorAll('input[type="checkbox"]')).map((input) => input.name);
    checkboxNames.forEach((name) => {
      payload[name] = Boolean(form.elements[name]?.checked);
    });

    return payload;
  }

  function upsertPlanillaInState(casaId, rawPlanilla) {
    if (!state.activeDetail || !rawPlanilla) {
      return false;
    }

    const targetHouseId = normalizeId(casaId);
    const nextPlanilla = normalizePlanilla(rawPlanilla);
    const houseIndex = safeArray(state.activeDetail.casas).findIndex(
      (house) => normalizeId(house.id) === targetHouseId
    );

    if (houseIndex < 0) {
      return false;
    }

    const house = state.activeDetail.casas[houseIndex];
    const planillas = [...safeArray(house.planillas)];
    const planillaIndex = planillas.findIndex(
      (planilla) => normalizeId(planilla.id) === normalizeId(nextPlanilla.id)
    );

    if (planillaIndex >= 0) {
      planillas[planillaIndex] = nextPlanilla;
    } else {
      planillas.unshift(nextPlanilla);
    }

    const rebuiltHouse = normalizeCasa({
      ...house,
      planillas,
      gastos: safeArray(house.gastos)
    });

    state.activeDetail.casas = state.activeDetail.casas.map((entry, index) =>
      index === houseIndex ? rebuiltHouse : entry
    );

    return true;
  }

  async function handleTreeSubmit(event) {
    const form = event.target.closest("form[data-action]");
    if (!form) {
      return;
    }

    event.preventDefault();
    const action = form.dataset.action;
    const context = readActionContext(form);
    const simulationId = context.simulacionId;
    const payload = readFormPayload(form);
    let response = null;

    if (action === "update-house") {
      response = await actualizarCasaSimulacion(simulationId, context.casaId, {
        adherente_id: payload.adherente_id || null,
        adherente_nombre: payload.adherente_nombre,
        precio_ars: numberOrZero(payload.precio_ars),
        fondo_disponible_ars: numberOrZero(payload.fondo_disponible_ars),
        descripcion: payload.descripcion,
        completada: Boolean(payload.completada)
      });
    } else if (action === "create-planilla") {
      response = await crearPlanillaCasa(simulationId, context.casaId, {
        numero: payload.numero,
        nro: payload.numero,
        numero_planilla: payload.numero,
        nro_planilla: payload.numero,
        fecha: payload.fecha,
        vencimiento: payload.vencimiento,
        proveedor: payload.proveedor,
        contratista: payload.contratista,
        adherente: payload.adherente,
        direccion: payload.direccion,
        observaciones: payload.observaciones
      });
    } else if (action === "update-planilla") {
      response = await actualizarPlanillaCasa(simulationId, context.casaId, context.planillaId, {
        numero: payload.numero,
        nro: payload.numero,
        numero_planilla: payload.numero,
        nro_planilla: payload.numero,
        fecha: payload.fecha,
        vencimiento: payload.vencimiento,
        proveedor: payload.proveedor,
        contratista: payload.contratista,
        adherente: payload.adherente,
        direccion: payload.direccion,
        observaciones: payload.observaciones
      });
    } else if (action === "create-item") {
      // Usar planilla_id del select si está disponible, sino usar context.planillaId del data-attribute
      const planillaId = payload.planilla_id || context.planillaId;
      if (!planillaId) {
        throw new Error("Selecciona la planilla destino para crear el item.");
      }
      response = await crearItemPlanilla(simulationId, context.casaId, planillaId, {
        nombre: payload.nombre,
        proveedor: payload.proveedor,
        descripcion: payload.descripcion,
        orden: numberOrZero(payload.orden)
      });
    } else if (action === "create-item-direct") {
      if (!payload.planilla_id) {
        throw new Error("Selecciona la planilla destino para crear el item.");
      }
      response = await crearItemPlanilla(simulationId, context.casaId, payload.planilla_id, {
        nombre: payload.nombre,
        proveedor: payload.proveedor,
        descripcion: payload.descripcion,
        orden: numberOrZero(payload.orden)
      });
    } else if (action === "update-item") {
      response = await actualizarItemPlanilla(simulationId, context.casaId, context.planillaId, context.itemId, {
        nombre: payload.nombre,
        proveedor: payload.proveedor,
        descripcion: payload.descripcion,
        orden: numberOrZero(payload.orden)
      });
    } else if (action === "create-material") {
      const precioUnitario = numberOrZero(payload.precio_unitario_ars);
      const cantidadTotal = numberOrZero(payload.cantidad_total);
      const cantidadRetirada = numberOrZero(payload.cantidad_retirada);
      const cantidadEnConstruccion = numberOrZero(payload.cantidad_en_construccion);
      if (cantidadTotal < 0 || cantidadRetirada < 0 || cantidadEnConstruccion < 0) {
        throw new Error("Las cantidades de material no pueden ser negativas.");
      }
      if (cantidadRetirada > cantidadTotal) {
        throw new Error("El retirado no puede superar la cantidad total del material.");
      }
      response = await crearMaterialPlanilla(simulationId, context.casaId, context.planillaId, context.itemId, {
        nombre: payload.nombre,
        unidad: payload.unidad,
        proveedor: payload.proveedor,
        descripcion: payload.descripcion,
        nota: payload.nota,
        cantidad_total: cantidadTotal,
        cantidad_retirada: cantidadRetirada,
        cantidad_en_construccion: cantidadEnConstruccion,
        precio_unitario_ars: precioUnitario,
        total_ars: Number((cantidadTotal * precioUnitario).toFixed(2))
      });
    } else if (action === "create-material-direct") {
      const precioUnitario = numberOrZero(payload.precio_unitario_ars);
      const cantidadTotal = numberOrZero(payload.cantidad_total);
      const cantidadRetirada = numberOrZero(payload.cantidad_retirada);
      const cantidadEnConstruccion = numberOrZero(payload.cantidad_en_construccion);
      if (cantidadTotal < 0 || cantidadRetirada < 0 || cantidadEnConstruccion < 0) {
        throw new Error("Las cantidades de material no pueden ser negativas.");
      }
      if (cantidadRetirada > cantidadTotal) {
        throw new Error("El retirado no puede superar la cantidad total del material.");
      }
      const [planillaId, itemId] = String(payload.target || "").split("::");
      if (!planillaId || !itemId) {
        throw new Error("Selecciona planilla e item para cargar el material.");
      }
      response = await crearMaterialPlanilla(simulationId, context.casaId, planillaId, itemId, {
        nombre: payload.nombre,
        unidad: payload.unidad,
        proveedor: payload.proveedor,
        descripcion: payload.descripcion,
        nota: payload.nota,
        cantidad_total: cantidadTotal,
        cantidad_retirada: cantidadRetirada,
        cantidad_en_construccion: cantidadEnConstruccion,
        precio_unitario_ars: precioUnitario,
        total_ars: Number((cantidadTotal * precioUnitario).toFixed(2))
      });
    } else if (action === "update-material") {
      const precioUnitario = numberOrZero(payload.precio_unitario_ars);
      const cantidadTotal = numberOrZero(payload.cantidad_total);
      const cantidadRetirada = numberOrZero(payload.cantidad_retirada);
      const cantidadEnConstruccion = numberOrZero(payload.cantidad_en_construccion);
      if (cantidadTotal < 0 || cantidadRetirada < 0 || cantidadEnConstruccion < 0) {
        throw new Error("Las cantidades de material no pueden ser negativas.");
      }
      if (cantidadRetirada > cantidadTotal) {
        throw new Error("El retirado no puede superar la cantidad total del material.");
      }
      response = await actualizarMaterialPlanilla(simulationId, context.casaId, context.planillaId, context.itemId, context.materialId, {
        nombre: payload.nombre,
        unidad: payload.unidad,
        proveedor: payload.proveedor,
        descripcion: payload.descripcion,
        nota: payload.nota,
        cantidad_total: cantidadTotal,
        cantidad_retirada: cantidadRetirada,
        cantidad_en_construccion: cantidadEnConstruccion,
        precio_unitario_ars: precioUnitario,
        total_ars: Number((cantidadTotal * precioUnitario).toFixed(2))
      });
    } else if (action === "create-movement") {
      const cantidadMovimiento = numberOrZero(payload.cantidad);
      if (cantidadMovimiento <= 0) {
        throw new Error("La cantidad entregada debe ser mayor a 0.");
      }

      const casa = safeArray(state.activeDetail?.casas).find((item) => normalizeId(item.id) === normalizeId(context.casaId));
      const planilla = safeArray(casa?.planillas).find((item) => normalizeId(item.id) === normalizeId(context.planillaId));
      const item = safeArray(planilla?.items).find((entry) => normalizeId(entry.id) === normalizeId(context.itemId));
      const material = safeArray(item?.materiales).find((entry) => normalizeId(entry.id) === normalizeId(context.materialId));
      const tipoMovimiento = payload.tipo || "entrega";
      if (material && tipoMovimiento === "entrega") {
        const disponible = Math.max(0, numberOrZero(material.cantidad_total) - numberOrZero(material.cantidad_retirada));
        if (cantidadMovimiento > disponible) {
          throw new Error(`No puedes entregar ${cantidadMovimiento}. Disponible en este item: ${disponible}.`);
        }
      }

      response = await registrarMovimientoEntrega({
        simulacion_id: simulationId,
        casa_id: context.casaId,
        planilla_id: context.planillaId,
        item_id: context.itemId,
        material_id: context.materialId,
        cantidad: cantidadMovimiento,
        fecha: payload.fecha || new Date().toISOString(),
        tipo: tipoMovimiento,
        observacion: payload.observacion || ""
      });
    } else if (action === "create-gasto") {
      response = await crearGastoCasa(simulationId, context.casaId, {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        monto_ars: numberOrZero(payload.monto_ars)
      });
    } else if (action === "update-gasto") {
      response = await actualizarGastoCasa(simulationId, context.casaId, context.gastoId, {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        monto_ars: numberOrZero(payload.monto_ars)
      });
    } else if (action === "create-mano-obra") {
      const tipo = payload.mano_obra_tipo || "monto";
      const manoObraPayload = {
        rubro: payload.rubro,
        descripcion: payload.descripcion,
        fecha: payload.fecha || new Date().toISOString()
      };
      
      if (tipo === "porcentaje") {
        manoObraPayload.porcentaje = numberOrZero(payload.porcentaje);
      } else {
        manoObraPayload.monto_ars = numberOrZero(payload.monto_ars);
      }
      
      response = await crearManoObraCasa(simulationId, context.casaId, manoObraPayload);
    } else if (action === "update-mano-obra") {
      const tipo = payload.mano_obra_tipo || "monto";
      const manoObraPayload = {
        rubro: payload.rubro,
        descripcion: payload.descripcion,
        fecha: payload.fecha || new Date().toISOString()
      };
      
      if (tipo === "porcentaje") {
        manoObraPayload.porcentaje = numberOrZero(payload.porcentaje);
      } else {
        manoObraPayload.monto_ars = numberOrZero(payload.monto_ars);
      }
      
      response = await actualizarManoObraCasa(simulationId, context.casaId, context.manoObraId, manoObraPayload);
    } else if (action === "create-house") {
      response = await crearCasaSimulacion(simulationId, {
        adherente_id: payload.adherente_id || null,
        adherente_nombre: payload.adherente_nombre,
        precio_ars: numberOrZero(payload.precio_ars),
        descripcion: payload.descripcion
      });
    }

    let shouldRenderAfterFallback = false;
    if (action === "create-planilla" || action === "update-planilla") {
      shouldRenderAfterFallback = upsertPlanillaInState(context.casaId, response);
    }

    await loadDetail(simulationId, true);

    // Si el backend respondió OK al POST/PATCH pero el reload no trae la planilla,
    // mantenemos visible la entidad desde la respuesta para no perderla en UI.
    if ((action === "create-planilla" || action === "update-planilla") && response) {
      const synced = upsertPlanillaInState(context.casaId, response);
      if (synced || shouldRenderAfterFallback) {
        renderDetail();
      }
    }

    setSummary(dom.simSummary, "Cambios guardados en la estructura de entregas.");
    writeLog(dom.systemLog, `Acción ${action}`, response);
  }

  function syncMaterialTotals(form) {
    const price = numberOrZero(form.querySelector('[name="precio_unitario_ars"]')?.value || 0);
    const quantity = numberOrZero(form.querySelector('[name="cantidad_total"]')?.value || 0);
    const totalField = form.querySelector('[name="total_ars"]');
    if (totalField) {
      totalField.value = String(Number((price * quantity).toFixed(2)));
    }
  }

  function getCreateButtonDefaultLabel(action) {
    if (action === "toggle-create-item") {
      return "Agregar item";
    }
    if (action === "toggle-create-item-direct") {
      return "Agregar item";
    }
    if (action === "toggle-create-material") {
      return "Agregar material";
    }
    if (action === "toggle-create-movement") {
      return "Agregar movimiento";
    }
    if (action === "toggle-create-planilla") {
      return "Agregar planilla";
    }
    if (action === "toggle-create-gasto") {
      return "Agregar gasto";
    }
    if (action === "toggle-create-material-direct") {
      return "Cargar material";
    }
    return "Agregar";
  }

  function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;

      const dialog = document.createElement("div");
      dialog.style.cssText = `
        background: white;
        border-radius: 14px;
        padding: 2rem;
        max-width: 400px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        font-family: inherit;
      `;

      const titleEl = document.createElement("h3");
      titleEl.textContent = title;
      titleEl.style.cssText = "margin: 0 0 1rem 0; font-size: 1.1rem;";

      const messageEl = document.createElement("p");
      messageEl.textContent = message;
      messageEl.style.cssText = "margin: 0 0 1.5rem 0; color: #666; line-height: 1.5;";

      const buttonsContainer = document.createElement("div");
      buttonsContainer.style.cssText = "display: flex; gap: 0.8rem; justify-content: flex-end;";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancelar";
      cancelBtn.style.cssText = `
        padding: 0.6rem 1.2rem;
        border: 1px solid #ddd;
        background: #f5f5f5;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;
      `;
      cancelBtn.onmouseover = () => (cancelBtn.style.background = "#e8e8e8");
      cancelBtn.onmouseout = () => (cancelBtn.style.background = "#f5f5f5");
      cancelBtn.onclick = () => {
        overlay.remove();
        resolve(false);
      };

      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "Borrar";
      confirmBtn.style.cssText = `
        padding: 0.6rem 1.2rem;
        border: none;
        background: #d32f2f;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;
      `;
      confirmBtn.onmouseover = () => (confirmBtn.style.background = "#b71c1c");
      confirmBtn.onmouseout = () => (confirmBtn.style.background = "#d32f2f");
      confirmBtn.onclick = () => {
        overlay.remove();
        resolve(true);
      };

      buttonsContainer.appendChild(cancelBtn);
      buttonsContainer.appendChild(confirmBtn);

      dialog.appendChild(titleEl);
      dialog.appendChild(messageEl);
      dialog.appendChild(buttonsContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      confirmBtn.focus();
    });
  }

  function showSaveSimulationModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;

      const dialog = document.createElement("div");
      dialog.style.cssText = `
        background: white;
        border-radius: 14px;
        padding: 2rem;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        font-family: inherit;
      `;

      const titleEl = document.createElement("h3");
      titleEl.textContent = "Guardar simulación";
      titleEl.style.cssText = "margin: 0 0 1.5rem 0; font-size: 1.1rem;";

      // Form campos
      const formContainer = document.createElement("div");
      formContainer.style.cssText = "display: flex; flex-direction: column; gap: 1rem;";

      const tituloLabel = document.createElement("label");
      tituloLabel.textContent = "Título *";
      tituloLabel.style.cssText = "font-weight: 600; font-size: 0.9rem;";
      const tituloInput = document.createElement("input");
      tituloInput.type = "text";
      tituloInput.placeholder = "Nombre de la simulación";
      tituloInput.required = true;
      tituloInput.style.cssText = `
        padding: 0.6rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
      `;
      formContainer.appendChild(tituloLabel);
      formContainer.appendChild(tituloInput);

      const descripcionLabel = document.createElement("label");
      descripcionLabel.textContent = "Descripción";
      descripcionLabel.style.cssText = "font-weight: 600; font-size: 0.9rem; margin-top: 0.5rem;";
      const descripcionInput = document.createElement("textarea");
      descripcionInput.placeholder = "Descripción de la simulación (opcional)";
      descripcionInput.rows = 3;
      descripcionInput.style.cssText = `
        padding: 0.6rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
        resize: vertical;
      `;
      formContainer.appendChild(descripcionLabel);
      formContainer.appendChild(descripcionInput);

      const buttonsContainer = document.createElement("div");
      buttonsContainer.style.cssText = "display: flex; gap: 0.8rem; justify-content: flex-end; margin-top: 1.5rem;";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancelar";
      cancelBtn.style.cssText = `
        padding: 0.6rem 1.2rem;
        border: 1px solid #ddd;
        background: #f5f5f5;
        color: #333;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;
      `;
      cancelBtn.onmouseover = () => (cancelBtn.style.background = "#e8e8e8");
      cancelBtn.onmouseout = () => (cancelBtn.style.background = "#f5f5f5");
      cancelBtn.onclick = () => {
        overlay.remove();
        resolve(null);
      };

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Guardar";
      saveBtn.style.cssText = `
        padding: 0.6rem 1.2rem;
        border: none;
        background: var(--primary);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;
      `;
      saveBtn.onmouseover = () => (saveBtn.style.background = "var(--primary-strong)");
      saveBtn.onmouseout = () => (saveBtn.style.background = "var(--primary)");
      saveBtn.onclick = async () => {
        if (!tituloInput.value.trim()) {
          alert("El título es obligatorio");
          return;
        }
        overlay.remove();
        resolve({
          titulo_snapshot: tituloInput.value.trim(),
          descripcion_snapshot: descripcionInput.value.trim()
        });
      };

      buttonsContainer.appendChild(cancelBtn);
      buttonsContainer.appendChild(saveBtn);

      dialog.appendChild(titleEl);
      dialog.appendChild(formContainer);
      dialog.appendChild(buttonsContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      tituloInput.focus();
    });
  }

  function showEditSimulationModal() {
    return new Promise((resolve) => {
      const detail = state.activeDetail;
      if (!detail) return;

      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;

      const dialog = document.createElement("div");
      dialog.style.cssText = `
        background: white;
        border-radius: 14px;
        padding: 2rem;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        font-family: inherit;
      `;

      const titleEl = document.createElement("h3");
      titleEl.textContent = "Editar simulación";
      titleEl.style.cssText = "margin: 0 0 1.5rem 0; font-size: 1.1rem;";

      // Form campos
      const formContainer = document.createElement("div");
      formContainer.style.cssText = "display: flex; flex-direction: column; gap: 1rem;";

      const tituloLabel = document.createElement("label");
      tituloLabel.textContent = "Título *";
      tituloLabel.style.cssText = "font-weight: 600; font-size: 0.9rem;";
      const tituloInput = document.createElement("input");
      tituloInput.type = "text";
      tituloInput.value = detail.titulo || "";
      tituloInput.required = true;
      tituloInput.style.cssText = `
        padding: 0.6rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
      `;
      formContainer.appendChild(tituloLabel);
      formContainer.appendChild(tituloInput);

      const descripcionLabel = document.createElement("label");
      descripcionLabel.textContent = "Descripción";
      descripcionLabel.style.cssText = "font-weight: 600; font-size: 0.9rem; margin-top: 0.5rem;";
      const descripcionInput = document.createElement("textarea");
      descripcionInput.value = detail.descripcion || "";
      descripcionInput.rows = 3;
      descripcionInput.style.cssText = `
        padding: 0.6rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
        resize: vertical;
      `;
      formContainer.appendChild(descripcionLabel);
      formContainer.appendChild(descripcionInput);

      const buttonsContainer = document.createElement("div");
      buttonsContainer.style.cssText = "display: flex; gap: 0.8rem; justify-content: flex-end; margin-top: 1.5rem;";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancelar";
      cancelBtn.style.cssText = `
        padding: 0.6rem 1.2rem;
        border: 1px solid #ddd;
        background: #f5f5f5;
        color: #333;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;
      `;
      cancelBtn.onmouseover = () => (cancelBtn.style.background = "#e8e8e8");
      cancelBtn.onmouseout = () => (cancelBtn.style.background = "#f5f5f5");
      cancelBtn.onclick = () => {
        overlay.remove();
        resolve(null);
      };

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Guardar cambios";
      saveBtn.style.cssText = `
        padding: 0.6rem 1.2rem;
        border: none;
        background: var(--primary);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;
      `;
      saveBtn.onmouseover = () => (saveBtn.style.background = "var(--primary-strong)");
      saveBtn.onmouseout = () => (saveBtn.style.background = "var(--primary)");
      saveBtn.onclick = async () => {
        if (!tituloInput.value.trim()) {
          alert("El título es obligatorio");
          return;
        }
        overlay.remove();
        resolve({
          titulo: tituloInput.value.trim(),
          descripcion: descripcionInput.value.trim()
        });
      };

      buttonsContainer.appendChild(cancelBtn);
      buttonsContainer.appendChild(saveBtn);

      dialog.appendChild(titleEl);
      dialog.appendChild(formContainer);
      dialog.appendChild(buttonsContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      tituloInput.focus();
    });
  }

  function closeCreateForms(container) {
    if (!container) {
      return;
    }

    container.querySelectorAll(".inventory-create-form.is-visible").forEach((form) => {
      form.classList.remove("is-visible");
    });

    container.querySelectorAll('[data-action^="toggle-create-"]').forEach((button) => {
      const action = button.getAttribute("data-action") || "";
      button.textContent = getCreateButtonDefaultLabel(action);
    });
  }

  function toggleCreateForm(container, formSelector, triggerAction) {
    if (!container) {
      return;
    }

    const form = container.querySelector(formSelector);
    if (!form) {
      return;
    }

    const shouldOpen = !form.classList.contains("is-visible");
    closeCreateForms(container);

    if (shouldOpen) {
      form.classList.add("is-visible");
      const trigger = container.querySelector(`[data-action="${triggerAction}"]`);
      if (trigger) {
        trigger.textContent = "Cancelar";
      }
    }
  }

  function setCardEditMode(card, enabled) {
    if (!card) {
      return;
    }

    const forms = Array.from(card.querySelectorAll(".inventory-editable-form"))
      .filter((form) => form.closest(".inventory-card, .inventory-mini-card") === card);

    card.classList.toggle("is-editing", enabled);
    forms.forEach((form) => {
      form.classList.toggle("is-visible", enabled);
    });

    if (enabled) {
      closeCreateForms(card);
    }

    const toggleButton = card.querySelector('[data-action="toggle-card-edit"]');
    if (toggleButton) {
      toggleButton.textContent = enabled ? "Cerrar edición" : "Editar";
    }
  }

  dom.simulationCreateForm?.addEventListener("submit", withUiFeedback(createSimulation));
  dom.buttonRefreshSimulations?.addEventListener("click", withUiFeedback(() => refreshList()));
  dom.buttonSaveSimulation?.addEventListener("click", withUiFeedback(saveSimulation));
  dom.buttonSaveSnapshot?.addEventListener("click", withUiFeedback(saveSnapshot));
  dom.buttonCloneSimulation?.addEventListener("click", withUiFeedback(cloneSimulation));
  dom.buttonRecalculateSimulation?.addEventListener("click", withUiFeedback(recalculateSimulation));

  async function deleteSimulationHandler(simulationId) {
    const confirmed = await showConfirmDialog(
      "Borrar simulación",
      "Se eliminará la simulación y TODOS los datos: casas, planillas, items, materiales y gastos. Esta acción no se puede deshacer."
    );
    if (!confirmed) {
      return;
    }
    try {
      await eliminarSimulacion(simulationId);
      state.activeId = null;
      state.activeDetail = null;
      await refreshList({ silent: true });
      renderDetail();
      setSummary(dom.simSummary, "Simulación eliminada correctamente.");
    } catch (error) {
      setSummary(dom.simSummary, `Error al eliminar: ${error.message}`);
    }
  }

  async function saveSimulationAsSnapshot() {
    const data = await showSaveSimulationModal();
    if (!data) return;

    try {
      const response = await guardarSimulacionComoCopia({
        titulo_snapshot: data.titulo_snapshot,
        descripcion_snapshot: data.descripcion_snapshot,
        horizonte_meses: state.activeDetail.horizonte_meses || 120,
        ofertas: state.activeDetail.ofertas || []
      });

      if (response.snapshot_id) {
        // Cargar la simulación guardada en Plan simulado
        await loadDetail(response.snapshot_id, false);
        setSummary(dom.simSummary, `Simulación "${data.titulo_snapshot}" guardada correctamente.`);
      }
    } catch (error) {
      setSummary(dom.simSummary, `Error al guardar: ${error.message}`);
    }
  }

  async function editSimulationSnapshot() {
    const detail = state.activeDetail;
    if (!detail?.snapshot_id) {
      setSummary(dom.simSummary, "Esta simulación no puede ser editada.");
      return;
    }

    const data = await showEditSimulationModal();
    if (!data) return;

    try {
      await actualizarSimulacionGuardada(detail.snapshot_id, {
        titulo: data.titulo,
        descripcion: data.descripcion
      });

      detail.titulo = data.titulo;
      detail.descripcion = data.descripcion;
      renderHouses(detail);
      setSummary(dom.simSummary, "Simulación actualizada correctamente.");
    } catch (error) {
      setSummary(dom.simSummary, `Error al actualizar: ${error.message}`);
    }
  }

  async function deletePlanillaHandler(simulationId, casaId, planillaId) {
    const confirmed = await showConfirmDialog(
      "Borrar planilla",
      "Se eliminará la planilla y todos sus items y materiales."
    );
    if (!confirmed) {
      return;
    }
    try {
      await eliminarPlanillaCasa(simulationId, casaId, planillaId);
      await loadDetail(simulationId, true);
      setSummary(dom.simSummary, "Planilla eliminada correctamente.");
    } catch (error) {
      setSummary(dom.simSummary, `Error: ${error.message}`);
    }
  }

  async function deleteItemHandler(simulationId, casaId, planillaId, itemId) {
    const confirmed = await showConfirmDialog(
      "Borrar item",
      "Se eliminará el item y todos sus materiales."
    );
    if (!confirmed) {
      return;
    }
    try {
      await eliminarItemPlanilla(simulationId, casaId, planillaId, itemId);
      await loadDetail(simulationId, true);
      setSummary(dom.simSummary, "Item eliminado correctamente.");
    } catch (error) {
      setSummary(dom.simSummary, `Error: ${error.message}`);
    }
  }

  async function deleteMaterialHandler(simulationId, casaId, planillaId, itemId, materialId) {
    const confirmed = await showConfirmDialog(
      "Borrar material",
      "Se eliminará el material y sus movimientos."
    );
    if (!confirmed) {
      return;
    }
    try {
      await eliminarMaterialPlanilla(simulationId, casaId, planillaId, itemId, materialId);
      await loadDetail(simulationId, true);
      setSummary(dom.simSummary, "Material eliminado correctamente.");
    } catch (error) {
      setSummary(dom.simSummary, `Error: ${error.message}`);
    }
  }

  async function deleteGastoHandler(simulationId, casaId, gastoId) {
    const confirmed = await showConfirmDialog(
      "Borrar gasto",
      "¿Estás seguro de que deseas eliminar este gasto?"
    );
    if (!confirmed) {
      return;
    }
    try {
      await eliminarGastoCasa(simulationId, casaId, gastoId);
      await loadDetail(simulationId, true);
      setSummary(dom.simSummary, "Gasto eliminado correctamente.");
    } catch (error) {
      setSummary(dom.simSummary, `Error: ${error.message}`);
    }
  }

  async function deleteManoObraHandler(simulationId, casaId, manoObraId) {
    const confirmed = await showConfirmDialog(
      "Borrar mano de obra",
      "¿Estás seguro de que deseas eliminar este registro?"
    );
    if (!confirmed) {
      return;
    }
    try {
      await eliminarManoObraCasa(simulationId, casaId, manoObraId);
      await loadDetail(simulationId, true);
      setSummary(dom.simSummary, "Mano de obra eliminada correctamente.");
    } catch (error) {
      setSummary(dom.simSummary, `Error: ${error.message}`);
    }
  }

  dom.simulationsList?.addEventListener("click", withUiFeedback(async (event) => {
    const deleteButton = event.target.closest('[data-action="delete-simulation"]');
    if (deleteButton) {
      const simId = normalizeId(deleteButton.getAttribute("data-simulation-id"));
      await deleteSimulationHandler(simId);
      return;
    }

    const openButton = event.target.closest('[data-action="open-simulation"]');
    if (!openButton) {
      return;
    }
    const selectedId = normalizeId(openButton.getAttribute("data-simulation-id"));
    state.activeId = selectedId;
    await loadDetail(selectedId);
    renderSimulationList();
    updateSummaryLine();
  }));

  dom.simulationHousesContainer?.addEventListener("submit", withUiFeedback(handleTreeSubmit));
  
  dom.simulationHousesContainer?.addEventListener("click", (event) => {
    // Manejar cambios en los radios de tipo de mano de obra
    const manoObraRadio = event.target.closest('input[name="mano_obra_tipo"]');
    if (manoObraRadio) {
      const form = manoObraRadio.closest('form');
      if (form) {
        const isMonto = manoObraRadio.value === "monto";
        const fieldMonto = form.querySelector('[id^="campo-monto-ars"]');
        const fieldPorcentaje = form.querySelector('[id^="campo-porcentaje"]');
        
        if (fieldMonto) fieldMonto.style.display = isMonto ? '' : 'none';
        if (fieldPorcentaje) fieldPorcentaje.style.display = isMonto ? 'none' : '';
      }
      return;
    }

    const toggleCreateItemButton = event.target.closest('[data-action="toggle-create-item"]');
    if (toggleCreateItemButton) {
      const container = toggleCreateItemButton.closest(".inventory-card") || toggleCreateItemButton.closest(".inventory-page");
      toggleCreateForm(container, 'form[data-action="create-item"]', "toggle-create-item");
      return;
    }

    const toggleCreateItemDirectButton = event.target.closest('[data-action="toggle-create-item-direct"]');
    if (toggleCreateItemDirectButton) {
      const container = toggleCreateItemDirectButton.closest(".inventory-section") || toggleCreateItemDirectButton.closest(".inventory-page");
      toggleCreateForm(container, 'form[data-action="create-item-direct"]', "toggle-create-item-direct");
      return;
    }

    const toggleCreateMaterialButton = event.target.closest('[data-action="toggle-create-material"]');
    if (toggleCreateMaterialButton) {
      const container = toggleCreateMaterialButton.closest(".inventory-card") || toggleCreateMaterialButton.closest(".inventory-page");
      toggleCreateForm(container, 'form[data-action="create-material"]', "toggle-create-material");
      return;
    }

    const toggleCreateMovementButton = event.target.closest('[data-action="toggle-create-movement"]');
    if (toggleCreateMovementButton) {
      const container = toggleCreateMovementButton.closest(".inventory-card");
      toggleCreateForm(container, 'form[data-action="create-movement"]', "toggle-create-movement");
      return;
    }

    const toggleCreatePlanillaButton = event.target.closest('[data-action="toggle-create-planilla"]');
    if (toggleCreatePlanillaButton) {
      const container = toggleCreatePlanillaButton.closest(".inventory-page") || toggleCreatePlanillaButton.closest(".inventory-section");
      toggleCreateForm(container, 'form[data-action="create-planilla"]', "toggle-create-planilla");
      return;
    }

    const toggleCreateGastoButton = event.target.closest('[data-action="toggle-create-gasto"]');
    if (toggleCreateGastoButton) {
      const container = toggleCreateGastoButton.closest(".inventory-page") || toggleCreateGastoButton.closest(".inventory-section");
      toggleCreateForm(container, 'form[data-action="create-gasto"]', "toggle-create-gasto");
      return;
    }

    const toggleCreateManoObraButton = event.target.closest('[data-action="toggle-create-mano-obra"]');
    if (toggleCreateManoObraButton) {
      const container = toggleCreateManoObraButton.closest(".inventory-page") || toggleCreateManoObraButton.closest(".inventory-section");
      toggleCreateForm(container, 'form[data-action="create-mano-obra"]', "toggle-create-mano-obra");
      return;
    }

    const toggleCreateMaterialDirectButton = event.target.closest('[data-action="toggle-create-material-direct"]');
    if (toggleCreateMaterialDirectButton) {
      const container = toggleCreateMaterialDirectButton.closest(".inventory-page") || toggleCreateMaterialDirectButton.closest(".inventory-section");
      toggleCreateForm(container, 'form[data-action="create-material-direct"]', "toggle-create-material-direct");
      return;
    }

    const toggleCreateHouseButton = event.target.closest('[data-action="toggle-create-house"]');
    if (toggleCreateHouseButton) {
      const container = toggleCreateHouseButton.closest(".inventory-page");
      toggleCreateForm(container, 'form[data-action="create-house"]', "toggle-create-house");
      return;
    }

    const toggleEditButton = event.target.closest('[data-action="toggle-card-edit"]');
    if (toggleEditButton) {
      const card = toggleEditButton.closest(".inventory-card, .inventory-mini-card");
      setCardEditMode(card, !card?.classList.contains("is-editing"));
      return;
    }

    const openSimulationSectionButton = event.target.closest('[data-action="open-simulation-section"]');
    if (openSimulationSectionButton) {
      const section = openSimulationSectionButton.getAttribute("data-section");
      if (section === "resumen") {
        state.planView = "resumen";
        state.selectedHouseId = null;
      } else if (section === "proyeccion") {
        state.planView = "proyeccion";
        state.selectedHouseId = null;
      }
      renderHouses(state.activeDetail);
      return;
    }

    const openSectionButton = event.target.closest('[data-action="open-houses-section"]');
    if (openSectionButton) {
      state.planView = "houses";
      state.selectedHouseId = null;
      renderHouses(state.activeDetail);
      return;
    }

    const backToRootButton = event.target.closest('[data-action="back-to-root"]');
    if (backToRootButton) {
      state.planView = "root";
      state.selectedHouseId = null;
      renderHouses(state.activeDetail);
      return;
    }

    const saveSImulationButton = event.target.closest('[data-action="open-save-simulation-modal"]');
    if (saveSImulationButton) {
      withUiFeedback(saveSimulationAsSnapshot)();
      return;
    }

    const editSimulationButton = event.target.closest('[data-action="open-edit-simulation-modal"]');
    if (editSimulationButton) {
      withUiFeedback(editSimulationSnapshot)();
      return;
    }

    const openButton = event.target.closest('[data-action="open-house"]');
    if (openButton) {
      state.planView = "house";
      state.selectedHouseId = normalizeId(openButton.getAttribute("data-house-id"));
      renderHouses(state.activeDetail);
      return;
    }

    const backButton = event.target.closest('[data-action="back-to-houses"]');
    if (backButton) {
      state.planView = "houses";
      state.selectedHouseId = null;
      renderHouses(state.activeDetail);
      return;
    }

    const backToHouseButton = event.target.closest('[data-action="back-to-house"]');
    if (backToHouseButton) {
      state.planView = "house";
      state.selectedPlanillaId = null;
      state.selectedItemId = null;
      renderHouses(state.activeDetail);
      return;
    }

    const openHouseButton = event.target.closest('[data-action="open-house"]');
    if (openHouseButton) {
      state.planView = "house";
      renderHouses(state.activeDetail);
      return;
    }

    const navRootButton = event.target.closest('[data-action="nav-root"]');
    if (navRootButton) {
      state.planView = "root";
      state.selectedHouseId = null;
      renderHouses(state.activeDetail);
      return;
    }

    const navHousesButton = event.target.closest('[data-action="nav-houses"]');
    if (navHousesButton) {
      state.planView = "houses";
      state.selectedHouseId = null;
      renderHouses(state.activeDetail);
    }

    const navPlanillasButton = event.target.closest('[data-action="nav-planillas"]');
    if (navPlanillasButton) {
      state.planView = "planillas";
      renderHouses(state.activeDetail);
    }

    const navItemsButton = event.target.closest('[data-action="nav-items"]');
    if (navItemsButton) {
      state.planView = "items";
      renderHouses(state.activeDetail);
    }

    const navMaterialesButton = event.target.closest('[data-action="nav-materiales"]');
    if (navMaterialesButton) {
      state.planView = "materiales";
      renderHouses(state.activeDetail);
    }

    const navGastosButton = event.target.closest('[data-action="nav-gastos"]');
    if (navGastosButton) {
      state.planView = "gastos";
      renderHouses(state.activeDetail);
      return;
    }

    const navManoObraButton = event.target.closest('[data-action="nav-mano-obra"]');
    if (navManoObraButton) {
      state.planView = "mano-obra";
      renderHouses(state.activeDetail);
      return;
    }

    const backToPlanillasButton = event.target.closest('[data-action="back-to-planillas"]');
    if (backToPlanillasButton) {
      state.planView = "planillas";
      state.selectedPlanillaId = null;
      renderHouses(state.activeDetail);
    }

    const backToItemsButton = event.target.closest('[data-action="back-to-items"]');
    if (backToItemsButton) {
      state.planView = "items";
      state.selectedItemId = null;
      renderHouses(state.activeDetail);
    }

    const openPlanillaButton = event.target.closest('[data-action="open-planilla"]');
    if (openPlanillaButton) {
      state.selectedPlanillaId = normalizeId(openPlanillaButton.getAttribute("data-planilla-id"));
      state.planView = "planilla";
      renderHouses(state.activeDetail);
    }

    const openItemButton = event.target.closest('[data-action="open-item"]');
    if (openItemButton) {
      state.selectedItemId = normalizeId(openItemButton.getAttribute("data-item-id"));
      state.planView = "item";
      renderHouses(state.activeDetail);
    }

    const toggleEditButton2 = event.target.closest('[data-action="toggle-card-edit"]');
    if (toggleEditButton2) {
      const card = toggleEditButton2.closest(".inventory-card, .inventory-mini-card");
      setCardEditMode(card, !card?.classList.contains("is-editing"));
      return;
    }

    const deletePlanillaButton = event.target.closest('[data-action="delete-planilla"]');
    if (deletePlanillaButton) {
      const planillaId = normalizeId(deletePlanillaButton.getAttribute("data-planilla-id"));
      const simId = getActiveSimulationId();
      const selectedHouseId = normalizeId(state.selectedHouseId);
      withUiFeedback(async () => {
        await deletePlanillaHandler(simId, selectedHouseId, planillaId);
      })();
      return;
    }

    const deleteItemButton = event.target.closest('[data-action="delete-item"]');
    if (deleteItemButton) {
      const itemId = normalizeId(deleteItemButton.getAttribute("data-item-id"));
      const simId = getActiveSimulationId();
      const selectedHouseId = normalizeId(state.selectedHouseId);
      const selectedPlanillaId = normalizeId(state.selectedPlanillaId);
      withUiFeedback(async () => {
        await deleteItemHandler(simId, selectedHouseId, selectedPlanillaId, itemId);
      })();
      return;
    }

    const deleteMaterialButton = event.target.closest('[data-action="delete-material"]');
    if (deleteMaterialButton) {
      const materialId = normalizeId(deleteMaterialButton.getAttribute("data-material-id"));
      const simId = getActiveSimulationId();
      const selectedHouseId = normalizeId(state.selectedHouseId);
      const selectedPlanillaId = normalizeId(state.selectedPlanillaId);
      const selectedItemId = normalizeId(state.selectedItemId);
      withUiFeedback(async () => {
        await deleteMaterialHandler(simId, selectedHouseId, selectedPlanillaId, selectedItemId, materialId);
      })();
      return;
    }

    const deleteGastoButton = event.target.closest('[data-action="delete-gasto"]');
    if (deleteGastoButton) {
      const gastoId = normalizeId(deleteGastoButton.getAttribute("data-gasto-id"));
      const simId = getActiveSimulationId();
      const selectedHouseId = normalizeId(state.selectedHouseId);
      withUiFeedback(async () => {
        await deleteGastoHandler(simId, selectedHouseId, gastoId);
      })();
      return;
    }

    const deleteManoObraButton = event.target.closest('[data-action="delete-mano-obra"]');
    if (deleteManoObraButton) {
      const manoObraId = normalizeId(deleteManoObraButton.getAttribute("data-mano-obra-id"));
      const simId = getActiveSimulationId();
      const selectedHouseId = normalizeId(state.selectedHouseId);
      withUiFeedback(async () => {
        await deleteManoObraHandler(simId, selectedHouseId, manoObraId);
      })();
      return;
    }
  });
  dom.simulationHousesContainer?.addEventListener("input", (event) => {
    const form = event.target.closest('form[data-action="create-material"], form[data-action="update-material"]');
    if (form) {
      syncMaterialTotals(form);
    }
  });


  dom.simulationTitleInput?.addEventListener("input", () => {
    if (dom.configSaveStatus) {
      dom.configSaveStatus.textContent = "La simulación se modificó localmente.";
    }
  });

  dom.simulationDetailMeta?.addEventListener("click", withUiFeedback(async (event) => {
    const backButton = event.target.closest('[data-action="back-to-simulations"]');
    if (backButton) {
      state.activeDetail = null;
      state.selectedHouseId = null;
      state.planView = "root";
      renderSimulationList();
      renderDetail();
      updateSummaryLine();
      setSummary(dom.simSummary, "");
    }
  }));

  return {
    refreshList,
    loadDetail,
    saveSimulationAsSnapshot,
    editSimulationSnapshot
  };
}
