export function valorVivienda(config) {
  return config.metros_cuadrados_vivienda * config.valor_por_m2;
}

export function toUsd(ars, tipoCambio) {
  if (!tipoCambio || tipoCambio <= 0) {
    return 0;
  }

  return ars / tipoCambio;
}

export function simularPlanLocal(config, cuotas, meses = 36) {
  const viviendaArs = valorVivienda(config);
  let fondo = 0;
  let activos = config.cantidad_de_adherentes;
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

    const ingresoMes = (activos * cuotas.mediaCuota) + (adjudicados * cuotas.cuotaCompleta);
    fondo += ingresoMes;

    let evento = "-";

    if (activos > 0 && fondo >= viviendaArs) {
      fondo -= viviendaArs;
      iniciadas += 1;
      activos -= 1;
      obras.push({ finMes: mes + config.duracion_construccion_meses });
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
    ingresoActual: (activos * cuotas.mediaCuota) + (adjudicados * cuotas.cuotaCompleta)
  };
}
