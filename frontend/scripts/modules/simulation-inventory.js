import { formatterArs } from "./formatters.js";
import {
  listarSimulacionesGuardadas,
  obtenerDetalleSimulacion,
  crearSimulacionGuardada,
  actualizarSimulacionGuardada,
  clonarSimulacionGuardada,
  recalcularSimulacionGuardada,
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
  actualizarGastoCasa
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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function asList(payload, keys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    for (const key of keys) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }

    const firstArray = Object.values(payload).find((entry) => Array.isArray(entry));
    if (Array.isArray(firstArray)) {
      return firstArray;
    }
  }

  return [];
}

function normalizeMovimiento(raw) {
  return {
    id: raw?.id ?? `mov-${Math.random().toString(16).slice(2)}`,
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
    id: raw?.id ?? `mat-${Math.random().toString(16).slice(2)}`,
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
    id: raw?.id ?? `item-${Math.random().toString(16).slice(2)}`,
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
    id: raw?.id ?? `planilla-${Math.random().toString(16).slice(2)}`,
    numero: String(raw?.numero ?? raw?.nro ?? "").trim(),
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

function normalizeCasa(raw) {
  const planillas = safeArray(raw?.planillas ?? raw?.entregas ?? raw?.ordenes).map(normalizePlanilla);
  const gastos = safeArray(raw?.gastos).map(normalizeGasto);
  const materiales = planillas.flatMap((planilla) => safeArray(planilla.items).flatMap((item) => safeArray(item.materiales)));
  const totalMateriales = planillas.reduce((acc, planilla) => acc + numberOrZero(planilla.total_materiales_ars), 0);
  const totalGastos = gastos.reduce((acc, gasto) => acc + numberOrZero(gasto.monto_ars), 0);
  const totalCantidadMaterial = materiales.reduce((acc, material) => acc + numberOrZero(material.cantidad_total), 0);
  const totalRetiradoCantidad = materiales.reduce((acc, material) => acc + numberOrZero(material.cantidad_retirada), 0);
  const totalEnConstruccionCantidad = materiales.reduce((acc, material) => acc + numberOrZero(material.cantidad_en_construccion), 0);
  const precioArs = numberOrZero(raw?.precio_ars ?? raw?.precio ?? 0);
  const fondoDisponibleArs = numberOrZero(raw?.fondo_disponible_ars ?? raw?.fondo_ars ?? raw?.plata_disponible_ars ?? precioArs);
  const comprometidoArs = Number((totalMateriales + totalGastos).toFixed(2));
  const saldoDisponibleArs = Number((fondoDisponibleArs - comprometidoArs).toFixed(2));
  const avance = fondoDisponibleArs > 0 ? Number(Math.min(100, Math.max(0, (comprometidoArs / fondoDisponibleArs) * 100)).toFixed(2)) : 0;

  return {
    id: raw?.id ?? `casa-${Math.random().toString(16).slice(2)}`,
    adherente_id: raw?.adherente_id ?? raw?.adherenteId ?? null,
    adherente_nombre: String(raw?.adherente_nombre ?? raw?.adherenteNombre ?? raw?.adherente ?? "").trim(),
    precio_ars: Number(precioArs.toFixed(2)),
    descripcion: String(raw?.descripcion ?? "").trim(),
    completada: Boolean(raw?.completada ?? raw?.is_completed ?? false),
    planillas,
    gastos,
    fondo_disponible_ars: Number(fondoDisponibleArs.toFixed(2)),
    total_material_cantidad: Number(totalCantidadMaterial.toFixed(2)),
    total_retirado_cantidad: Number(totalRetiradoCantidad.toFixed(2)),
    total_en_construccion_cantidad: Number(totalEnConstruccionCantidad.toFixed(2)),
    total_materiales_ars: Number(totalMateriales.toFixed(2)),
    total_gastos_ars: Number(totalGastos.toFixed(2)),
    saldo_ars: saldoDisponibleArs,
    avance_financiero_pct: avance
  };
}

function normalizeSimulation(detail, fallbackId = null) {
  return {
    id: detail?.id ?? fallbackId,
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
  const movimientos = casas
    .flatMap((casa) => casa.planillas || [])
    .flatMap((planilla) => planilla.items || [])
    .flatMap((item) => item.materiales || [])
    .flatMap((material) => material.movimientos || []);
  const totalMateriales = materiales.reduce((acc, material) => acc + numberOrZero(material.total_ars), 0);
  const totalGastos = gastos.reduce((acc, gasto) => acc + numberOrZero(gasto.monto_ars), 0);
  const totalSaldo = casas.reduce((acc, casa) => acc + numberOrZero(casa.saldo_ars), 0);

  return {
    casas: casas.length,
    planillas: planillas.length,
    items: items.length,
    materiales: materiales.length,
    movimientos: movimientos.length,
    gastos: gastos.length,
    totalMateriales: Number(totalMateriales.toFixed(2)),
    totalGastos: Number(totalGastos.toFixed(2)),
    totalSaldo: Number(totalSaldo.toFixed(2)),
    materialesAgrupados: materiales
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
      </div>

      <form class="inventory-form inventory-editable-form inventory-form-tight inventory-grid-3" data-action="update-planilla" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(casaId)}" data-planilla-id="${escapeHtml(planilla.id)}">
        ${inputField("Número", "numero", planilla.numero)}
        ${inputField("Fecha", "fecha", planilla.fecha || "", "date")}
        ${inputField("Vencimiento", "vencimiento", planilla.vencimiento || "", "date")}
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

function renderHouse(house, context) {
  const { simulacionId } = context;
  const comprometidoArs = Number((numberOrZero(house.total_materiales_ars) + numberOrZero(house.total_gastos_ars)).toFixed(2));
  const usoFondoPct = house.fondo_disponible_ars > 0
    ? Number(Math.min(100, Math.max(0, (comprometidoArs / house.fondo_disponible_ars) * 100)).toFixed(2))
    : 0;
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
          <p class="inventory-subtitle">Saldo ${money(house.saldo_ars)} | Materiales ${money(house.total_materiales_ars)} | Gastos ${money(house.total_gastos_ars)}</p>
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
          <div class="progress-fill" style="width:${escapeHtml(usoFondoPct)}%"></div>
        </div>
        <p class="inventory-subtitle">Uso de fondo: ${escapeHtml(usoFondoPct)}%</p>
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
        <div class="inventory-section-head">
          <h5>Items de la casa</h5>
          <div class="inventory-section-actions">
            <span>${escapeHtml(houseItems.length)} items</span>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-item-direct">Agregar item</button>
          </div>
        </div>

        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-3" data-action="create-item-direct" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(house.id)}">
          <label>
            Planilla destino
            <select name="planilla_id" required>
              <option value="">Seleccionar...</option>
              ${house.planillas.map((planilla) => `<option value="${escapeHtml(planilla.id)}">${escapeHtml(`Planilla ${planilla.numero || planilla.id}`)}</option>`).join("")}
            </select>
          </label>
          ${inputField("Nombre", "nombre", "")}
          ${inputField("Proveedor", "proveedor", "")}
          ${inputField("Descripción", "descripcion", "")}
          ${inputField("Orden", "orden", 1, "number", "step=1")}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-primary" type="submit">Guardar item</button>
          </div>
        </form>

        <div class="inventory-children">
          ${houseItems.length === 0 ? '<p class="inventory-empty">Sin items cargados en esta casa.</p>' : houseItems.map(({ planilla, item }) => `
            <article class="inventory-mini-card">
              <p class="inventory-kicker">Planilla ${escapeHtml(planilla.numero || planilla.id)}</p>
              ${renderItem(item, { simulacionId, casaId: house.id, planillaId: planilla.id })}
            </article>
          `).join("")}
        </div>
      </section>

      <section class="inventory-section">
        <div class="inventory-section-head">
          <h5>Planillas de entrega</h5>
          <div class="inventory-section-actions">
            <span>${escapeHtml(house.planillas.length)} registros</span>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-planilla">Agregar planilla</button>
          </div>
        </div>

        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-3" data-action="create-planilla" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(house.id)}">
          ${inputField("Número", "numero", "")}
          ${inputField("Fecha", "fecha", new Date().toISOString().slice(0, 10), "date")}
          ${inputField("Vencimiento", "vencimiento", "", "date")}
          ${inputField("Proveedor", "proveedor", "")}
          ${inputField("Contratista", "contratista", "")}
          ${inputField("Adherente", "adherente", house.adherente_nombre)}
          ${inputField("Dirección", "direccion", "")}
          ${textAreaField("Observaciones", "observaciones", "", 2)}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-primary" type="submit">Crear planilla</button>
          </div>
        </form>

        ${renderHouseMaterials(house)}
      </section>

      <section class="inventory-section">
        <div class="inventory-section-head">
          <h5>Gastos por casa</h5>
          <div class="inventory-section-actions">
            <span>${escapeHtml(house.gastos.length)} gastos</span>
            <button class="btn btn-ghost" type="button" data-action="toggle-create-gasto">Agregar gasto</button>
          </div>
        </div>

        <form class="inventory-form inventory-create-form inventory-form-tight inventory-grid-2" data-action="create-gasto" data-simulacion-id="${escapeHtml(simulacionId)}" data-casa-id="${escapeHtml(house.id)}">
          ${inputField("Nombre", "nombre", "")}
          ${inputField("Monto ARS", "monto_ars", 0, "number", "min=0 step=0.01")}
          ${textAreaField("Descripción", "descripcion", "", 2)}
          <div class="inventory-actions inventory-actions-full">
            <button class="btn btn-ghost" type="submit">Agregar gasto</button>
          </div>
        </form>

        <div class="inventory-children">
          ${house.gastos.length === 0 ? '<p class="inventory-empty">Sin gastos cargados.</p>' : house.gastos.map((gasto) => renderGasto(gasto, { simulacionId, casaId: house.id })).join("")}
        </div>
      </section>
    </article>
  `;
}

async function loadSimulationTree(simulacionId) {
  const simulationDetail = await obtenerDetalleSimulacion(simulacionId);
  const detailHouses = asList(simulationDetail, ["casas", "houses", "items"]);

  let housesBase = detailHouses;
  if (!housesBase.length) {
    const housesRaw = await listarCasasSimulacion(simulacionId).catch(() => []);
    housesBase = asList(housesRaw, ["casas", "items", "houses"]);
  }

  if (!housesBase.length) {
    const normalizedOnlyDetail = normalizeSimulation(simulationDetail, simulacionId);
    if (!normalizedOnlyDetail.titulo) {
      normalizedOnlyDetail.titulo = `Simulacion #${simulacionId}`;
    }
    return normalizedOnlyDetail;
  }

  const houses = await Promise.all(housesBase.map(async (houseRaw) => {
    const [planillasRaw, gastosRaw] = await Promise.all([
      listarPlanillasCasa(simulacionId, houseRaw.id).catch(() => []),
      listarGastosCasa(simulacionId, houseRaw.id).catch(() => [])
    ]);

    const planillasSource = asList(planillasRaw, ["planillas", "entregas", "items"]);
    const gastos = asList(gastosRaw, ["gastos"]).map(normalizeGasto);

    const planillas = await Promise.all(planillasSource.map(async (planillaRaw) => {
      const itemsRaw = await listarItemsPlanilla(simulacionId, houseRaw.id, planillaRaw.id).catch(() => []);
      const itemsSource = asList(itemsRaw, ["items", "detalles"]);

      const items = await Promise.all(itemsSource.map(async (itemRaw) => {
        const materialsRaw = await listarMaterialesItem(simulacionId, houseRaw.id, planillaRaw.id, itemRaw.id).catch(() => []);
        const materialsSource = asList(materialsRaw, ["materiales", "items"]);

        const materiales = await Promise.all(materialsSource.map(async (materialRaw) => {
          const movimientosRaw = await listarMovimientosMaterial({
            simulacion_id: simulacionId,
            casa_id: houseRaw.id,
            planilla_id: planillaRaw.id,
            item_id: itemRaw.id,
            material_id: materialRaw.id
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

    return normalizeCasa({ ...houseRaw, planillas, gastos });
  }));

  const normalized = normalizeSimulation({ ...simulationDetail, casas }, simulacionId);

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
    planView: "root",
    loading: false
  };

  const planSection = document.getElementById("plan-simulado");

  function syncPlanFocusMode() {
    if (!planSection) {
      return;
    }

    const isSectionFocused = state.planView !== "root";
    planSection.classList.toggle("plan-section-focused", isSectionFocused);
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
    const active = state.activeDetail ? ` | Actual: ${state.activeDetail.titulo}` : "";
    dom.simulationsSummary.textContent = `Total simulaciones: ${state.list.length}${active}`;
  }

  function renderSimulationList() {
    if (!dom.simulationsList) {
      return;
    }

    if (state.list.length === 0) {
      dom.simulationsList.innerHTML = '<p class="inventory-empty">No hay simulaciones guardadas.</p>';
      return;
    }

    dom.simulationsList.innerHTML = state.list.map((sim) => `
      <button class="simulation-list-item ${normalizeId(sim.id) === normalizeId(state.activeId) ? "is-active" : ""}" type="button" data-simulation-id="${escapeHtml(sim.id)}">
        <h4>${escapeHtml(sim.titulo || sim.title || `Simulacion #${sim.id}`)}</h4>
        <p>${escapeHtml(sim.descripcion || sim.description || "Sin descripción")}</p>
      </button>
    `).join("");
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

  function renderGlobalMaterials(summary) {
    if (!dom.simulationGlobalMaterials) {
      return;
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

  function renderHouses(detail) {
    if (!dom.simulationHousesContainer) {
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

    if (state.planView === "houses") {
      syncPlanFocusMode();
      dom.buttonAddHouse?.classList.remove("hidden");
      dom.simulationHousesContainer.innerHTML = `
        <section class="inventory-page inventory-page-list">
        ${renderPlanBreadcrumb([
          { label: "Plan simulado", action: "nav-root" },
          { label: "Casas", current: true }
        ])}
        <div class="inventory-drilldown-head">
          <h4 class="inventory-page-title">Casas de la simulación</h4>
        </div>
        <p class="inventory-page-subtitle">Elegí una casa para abrir su detalle completo.</p>
        <div class="house-selector-grid">
          ${detail.casas.map((house) => renderHouseSelectorCard(house)).join("")}
        </div>
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
      ${renderPlanBreadcrumb([{ label: "Plan simulado", current: true }])}
      <div class="inventory-drilldown-head">
        <h4 class="inventory-page-title">Secciones del plan</h4>
      </div>
      <p class="inventory-page-subtitle">Entrá a Casas para navegar la información por vivienda.</p>
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
        dom.simulationDetailMeta.textContent = "Seleccioná una simulación de la lista para cargar su inventario.";
      }
      if (dom.simulationHousesContainer) {
        dom.simulationHousesContainer.innerHTML = '<p class="inventory-empty">Seleccioná una simulación para cargar casas y entregas.</p>';
      }
      return;
    }

    const summary = buildSummary(state.activeDetail);

    if (dom.simulationDetailTitle) {
      dom.simulationDetailTitle.textContent = `Simulación activa: ${state.activeDetail.titulo || `#${state.activeDetail.id}`}`;
    }

    if (dom.simulationDetailMeta) {
      const updated = state.activeDetail.updated_at ? new Date(state.activeDetail.updated_at).toLocaleString("es-AR") : "sin fecha";
      dom.simulationDetailMeta.textContent = `ID ${state.activeDetail.id} | Última actualización: ${updated}`;
    }

    if (dom.simulationTitleInput) {
      dom.simulationTitleInput.value = state.activeDetail.titulo || "";
    }

    if (dom.simulationDescriptionInput) {
      dom.simulationDescriptionInput.value = state.activeDetail.descripcion || "";
    }

    renderSummaryCards(summary);
    renderGlobalMaterials(summary);
    renderTimelinePreview(state.activeDetail.timeline || []);
    renderHouses(state.activeDetail);
    if (typeof setConfigToForm === "function" && state.activeDetail.configuracion) {
      setConfigToForm(dom.form, state.activeDetail.configuracion);
      updateMetodologiaUI();
      updateConfigPreview();
    }
  }

  async function loadDetail(simulationId, silent = false) {
    state.loading = true;
    const normalizedSimulationId = normalizeId(simulationId);
    let graph;

    try {
      graph = await loadSimulationTree(normalizedSimulationId);
    } catch {
      graph = buildFallbackSimulation(normalizedSimulationId, state.list);
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

    if (!state.activeId && state.list.length > 0) {
      state.activeId = normalizeId(state.list[0].id);
    }

    renderSimulationList();
    updateSummaryLine();

    if (state.activeId) {
      await loadDetail(state.activeId, true);
    } else {
      state.activeDetail = null;
      renderDetail();
    }

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

  async function createHouseFromForm(event) {
    event.preventDefault();
    const simulationId = getActiveSimulationId();
    const form = dom.houseCreateForm;
    const data = new FormData(form);
    const adherenteId = numberOrZero(data.get("adherente_id") || data.get("house-create-adherente-id") || 0);
    const adherenteNombre = String(data.get("adherente_nombre") || data.get("house-create-adherente") || "").trim();
    const precioArs = numberOrZero(data.get("precio_ars") || data.get("house-create-precio") || 0);
    const descripcion = String(data.get("descripcion") || data.get("house-create-descripcion") || "").trim();

    if (!adherenteNombre && adherenteId < 1) {
      throw new Error("Ingresa nombre o ID del adherente.");
    }

    if (precioArs <= 0) {
      throw new Error("Ingresa un precio de casa válido.");
    }

    const payload = {
      adherente_id: adherenteId > 0 ? adherenteId : null,
      adherente_nombre: adherenteNombre,
      precio_ars: Number(precioArs.toFixed(2)),
      descripcion,
      completada: false
    };

    const response = await crearCasaSimulacion(simulationId, payload);
    form.reset();
    const updatedSnapshot = normalizeSimulation(response, simulationId);
    if (updatedSnapshot?.casas?.length) {
      state.activeId = normalizeId(updatedSnapshot.id ?? simulationId);
      state.activeDetail = updatedSnapshot;
      renderSimulationList();
      updateSummaryLine();
      renderDetail();
    } else {
      await loadDetail(simulationId, true);
    }
    setSummary(dom.simSummary, "Casa creada correctamente.");
    writeLog(dom.systemLog, "Crear casa", response);
  }

  function readActionContext(form) {
    return {
      simulacionId: form.dataset.simulacionId || getActiveSimulationId(),
      casaId: form.dataset.casaId || null,
      planillaId: form.dataset.planillaId || null,
      itemId: form.dataset.itemId || null,
      materialId: form.dataset.materialId || null,
      gastoId: form.dataset.gastoId || null
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
        fecha: payload.fecha,
        vencimiento: payload.vencimiento,
        proveedor: payload.proveedor,
        contratista: payload.contratista,
        adherente: payload.adherente,
        direccion: payload.direccion,
        observaciones: payload.observaciones
      });
    } else if (action === "create-item") {
      response = await crearItemPlanilla(simulationId, context.casaId, context.planillaId, {
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
    }

    await loadDetail(simulationId, true);
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
  dom.buttonAddHouse?.addEventListener("click", () => {
    if (!state.activeDetail?.id && !state.activeId) {
      return;
    }
    dom.houseCreateForm?.classList.remove("hidden");
    dom.houseCreateAdherenteInput?.focus();
  });
  dom.houseCreateForm?.addEventListener("submit", withUiFeedback(createHouseFromForm));
  dom.buttonHouseCreateCancel?.addEventListener("click", () => {
    dom.houseCreateForm?.reset();
    dom.houseCreateForm?.classList.add("hidden");
  });

  dom.simulationsList?.addEventListener("click", withUiFeedback(async (event) => {
    const button = event.target.closest("[data-simulation-id]");
    if (!button) {
      return;
    }
    const selectedId = normalizeId(button.getAttribute("data-simulation-id"));
    state.activeId = selectedId;
    renderSimulationList();
    updateSummaryLine();
    await loadDetail(selectedId);
  }));

  dom.simulationHousesContainer?.addEventListener("submit", withUiFeedback(handleTreeSubmit));
  dom.simulationHousesContainer?.addEventListener("click", (event) => {
    const toggleCreateItemButton = event.target.closest('[data-action="toggle-create-item"]');
    if (toggleCreateItemButton) {
      const card = toggleCreateItemButton.closest(".inventory-card");
      toggleCreateForm(card, 'form[data-action="create-item"]', "toggle-create-item");
      return;
    }

    const toggleCreateItemDirectButton = event.target.closest('[data-action="toggle-create-item-direct"]');
    if (toggleCreateItemDirectButton) {
      const section = toggleCreateItemDirectButton.closest(".inventory-section");
      toggleCreateForm(section, 'form[data-action="create-item-direct"]', "toggle-create-item-direct");
      return;
    }

    const toggleCreateMaterialButton = event.target.closest('[data-action="toggle-create-material"]');
    if (toggleCreateMaterialButton) {
      const card = toggleCreateMaterialButton.closest(".inventory-card");
      toggleCreateForm(card, 'form[data-action="create-material"]', "toggle-create-material");
      return;
    }

    const toggleCreateMovementButton = event.target.closest('[data-action="toggle-create-movement"]');
    if (toggleCreateMovementButton) {
      const card = toggleCreateMovementButton.closest(".inventory-card");
      toggleCreateForm(card, 'form[data-action="create-movement"]', "toggle-create-movement");
      return;
    }

    const toggleCreatePlanillaButton = event.target.closest('[data-action="toggle-create-planilla"]');
    if (toggleCreatePlanillaButton) {
      const section = toggleCreatePlanillaButton.closest(".inventory-section");
      toggleCreateForm(section, 'form[data-action="create-planilla"]', "toggle-create-planilla");
      return;
    }

    const toggleCreateGastoButton = event.target.closest('[data-action="toggle-create-gasto"]');
    if (toggleCreateGastoButton) {
      const section = toggleCreateGastoButton.closest(".inventory-section");
      toggleCreateForm(section, 'form[data-action="create-gasto"]', "toggle-create-gasto");
      return;
    }

    const toggleCreateMaterialDirectButton = event.target.closest('[data-action="toggle-create-material-direct"]');
    if (toggleCreateMaterialDirectButton) {
      const section = toggleCreateMaterialDirectButton.closest(".inventory-section");
      toggleCreateForm(section, 'form[data-action="create-material-direct"]', "toggle-create-material-direct");
      return;
    }

    const toggleEditButton = event.target.closest('[data-action="toggle-card-edit"]');
    if (toggleEditButton) {
      const card = toggleEditButton.closest(".inventory-card, .inventory-mini-card");
      setCardEditMode(card, !card?.classList.contains("is-editing"));
      return;
    }

    const openSectionButton = event.target.closest('[data-action="open-houses-section"]');
    if (openSectionButton) {
      state.planView = "houses";
      state.selectedHouseId = null;
      renderHouses(state.activeDetail);
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

  return {
    refreshList,
    loadDetail
  };
}
