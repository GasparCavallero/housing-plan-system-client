// utils/chartBuilders.js

function countStartsFromEvent(eventText) {
  if (!eventText) return 0;
  let total = 0;
  // separa por "|" para manejar eventos compuestos
  const parts = String(eventText).split("|");
  for (const part of parts) {
    const trimmed = part.trim();
    if (/inicio casa/i.test(trimmed)) {
      // cuenta los números listados después de "Inicio casa"
      const after = trimmed.replace(/inicio casa/i, "");
      const nums = after.match(/\d+/g);
      total += nums ? nums.length : 1;
    }
  }
  return total;
}

function countFinishesFromEvent(eventText) {
  if (!eventText) return 0;
  let total = 0;
  const parts = String(eventText).split("|");
  for (const part of parts) {
    const trimmed = part.trim();
    if (/finaliz\w* casa/i.test(trimmed)) {
      const after = trimmed.replace(/finaliz\w* casa[s]?/i, "");
      const nums = after.match(/\d+/g);
      total += nums ? nums.length : 1;
    }
  }
  return total;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function buildCasasIniciadasData(rows) {
  const byYear = {};
  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) return;
    const ano = Math.floor(mes / 12) + 1;
    // solo contamos desde el evento — es la única fuente confiable
    const val = countStartsFromEvent(row?.evento ?? row?.evento_mes);
    byYear[ano] = (byYear[ano] ?? 0) + val;
  });
  return Object.entries(byYear)
    .map(([ano, val]) => ({ ano: Number(ano), val }))
    .filter((p) => p.ano > 0)
    .sort((a, b) => a.ano - b.ano);
}

export function buildCasasTerminadasData(rows) {
  const byYear = {};
  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) return;
    const ano = Math.floor(mes / 12) + 1;
    // solo contamos desde el evento
    const val = countFinishesFromEvent(row?.evento ?? row?.evento_mes);
    byYear[ano] = (byYear[ano] ?? 0) + val;
  });
  return Object.entries(byYear)
    .map(([ano, val]) => ({ ano: Number(ano), val }))
    .filter((p) => p.ano > 0)
    .sort((a, b) => a.ano - b.ano);
}

export function buildRecaudacionData(rows, valorViviendaArs) {
  const byYear = {};
  rows.forEach((row) => {
    const mes = Number(row?.mes);
    if (!Number.isFinite(mes)) return;
    const ano = Math.floor(mes / 12) + 1;
    const ingresoMes = Number(row?.ingresoMes ?? row?.ingreso_mes_ars);
    const val = Number.isFinite(ingresoMes) && ingresoMes > 0 ? ingresoMes : 0;
    byYear[ano] = roundMoney((byYear[ano] ?? 0) + val);
  });
  return Object.entries(byYear)
    .map(([ano, recaudadoArs]) => ({
      ano: Number(ano),
      val: recaudadoArs,
      casasAlcanzables: Number.isFinite(valorViviendaArs) && valorViviendaArs > 0
        ? Number((recaudadoArs / valorViviendaArs).toFixed(2))
        : 0,
    }))
    .filter((p) => p.ano > 0)
    .sort((a, b) => a.ano - b.ano);
}