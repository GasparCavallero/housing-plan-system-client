from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import (
    AdherenteDB,
    ViviendaEnConstruccionDB,
    get_or_create_configuracion,
    get_or_create_estado_plan,
    to_adherente,
    to_configuracion,
    to_estado_plan,
)
from app.models.adherente import EstadoAdherente, OfertaLicitacion
from app.models.plan import MetodoAdjudicacion, ViviendaEnConstruccion
from app.services.adjudicaciones import adjudicar_por_licitacion, adjudicar_por_sorteo
from app.services.calculos import calcular_ingreso_mensual, construir_resumen_financiero
from app.services.security import get_current_user, require_operator_or_admin
from app.services.simulacion import simular_evolucion_plan

router = APIRouter(
    prefix="/planes",
    tags=["Planes"],
    dependencies=[Depends(get_current_user)],
)


class ProcesarMesRequest(BaseModel):
    metodo_adjudicacion: MetodoAdjudicacion = MetodoAdjudicacion.SORTEO
    ofertas: list[OfertaLicitacion] = Field(default_factory=list)


class SimulacionRequest(BaseModel):
    horizonte_meses: int = Field(default=24, ge=1)


@router.get("/estado")
def obtener_estado_plan(db: Session = Depends(get_db)):
    configuracion_db = get_or_create_configuracion(db)
    estado_db = get_or_create_estado_plan(db)
    adherentes_db = db.query(AdherenteDB).order_by(AdherenteDB.id).all()
    construcciones_db = (
        db.query(ViviendaEnConstruccionDB).order_by(ViviendaEnConstruccionDB.id).all()
    )
    configuracion = to_configuracion(configuracion_db)
    adherentes = [to_adherente(item) for item in adherentes_db]
    return {
        "configuracion": configuracion,
        "estado": to_estado_plan(estado_db, construcciones_db),
        "resumen": construir_resumen_financiero(
            fondo_ars=estado_db.fondo_ars,
            adherentes=adherentes,
            config=configuracion,
        ),
    }


@router.post("/procesar-mes")
def procesar_mes(
    payload: ProcesarMesRequest,
    _: object = Depends(require_operator_or_admin),
    db: Session = Depends(get_db),
):
    config = to_configuracion(get_or_create_configuracion(db))
    estado = get_or_create_estado_plan(db)
    adherentes_db = db.query(AdherenteDB).order_by(AdherenteDB.id).all()
    adherentes = [to_adherente(item) for item in adherentes_db]
    construcciones_db = db.query(ViviendaEnConstruccionDB).all()

    estado.mes_actual += 1
    estado.fondo_ars += calcular_ingreso_mensual(adherentes, config)

    # Al cumplir mes_fin, la vivienda se considera entregada y el adherente pasa a cuota completa.
    for construccion in construcciones_db:
        if construccion.mes_fin == estado.mes_actual:
            adherente = db.get(AdherenteDB, construccion.adherente_id)
            if adherente:
                adherente.estado = EstadoAdherente.ADJUDICADO.value
                estado.casas_entregadas += 1

    valor_vivienda = config.valor_total_vivienda
    if estado.fondo_ars >= valor_vivienda:
        adjudicado = None

        if payload.metodo_adjudicacion == MetodoAdjudicacion.SORTEO:
            adjudicado = adjudicar_por_sorteo(adherentes)
        elif payload.metodo_adjudicacion == MetodoAdjudicacion.LICITACION:
            adjudicado, oferta = adjudicar_por_licitacion(adherentes, payload.ofertas)
            if adjudicado and oferta:
                cuotas_restantes = max(
                    config.cantidad_cuotas - adjudicado.cuotas_pagadas, 0
                )
                bonificacion = round(
                    (oferta.porcentaje_cuotas_restantes / 100.0) * cuotas_restantes
                )
                adjudicado_db = db.get(AdherenteDB, adjudicado.id)
                if adjudicado_db is not None:
                    adjudicado_db.cuotas_bonificadas_por_licitacion += bonificacion

        if adjudicado is None:
            raise HTTPException(
                status_code=400, detail="No hay adherentes elegibles para adjudicar"
            )

        adjudicado_db = db.get(AdherenteDB, adjudicado.id)
        if adjudicado_db is None:
            raise HTTPException(status_code=404, detail="Adherente no encontrado")

        adjudicado_db.estado = EstadoAdherente.EN_CONSTRUCCION.value
        estado.fondo_ars -= valor_vivienda
        estado.casas_iniciadas += 1
        db.add(
            ViviendaEnConstruccionDB(
                adherente_id=adjudicado.id,
                mes_inicio=estado.mes_actual,
                mes_fin=estado.mes_actual + config.duracion_construccion_meses,
                metodo=payload.metodo_adjudicacion.value,
            )
        )

    db.commit()

    return {
        "mes_actual": estado.mes_actual,
        "fondo_ars": estado.fondo_ars,
        "casas_iniciadas": estado.casas_iniciadas,
        "casas_entregadas": estado.casas_entregadas,
    }


@router.post("/simular")
def simular(payload: SimulacionRequest, db: Session = Depends(get_db)):
    configuracion = to_configuracion(get_or_create_configuracion(db))
    estado = get_or_create_estado_plan(db)
    adherentes = [
        to_adherente(item)
        for item in db.query(AdherenteDB).order_by(AdherenteDB.id).all()
    ]
    return simular_evolucion_plan(
        adherentes=adherentes,
        config=configuracion,
        fondo_inicial_ars=estado.fondo_ars,
        horizonte_meses=payload.horizonte_meses,
    )
