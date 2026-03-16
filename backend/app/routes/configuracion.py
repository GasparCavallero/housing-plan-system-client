from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import (
    AdherenteDB,
    get_or_create_configuracion,
    get_or_create_estado_plan,
    to_adherente,
    to_configuracion,
)
from app.models.plan import ConfiguracionPlan
from app.services.calculos import construir_resumen_financiero
from app.services.security import get_current_user, require_admin

router = APIRouter(
    prefix="/configuracion",
    tags=["Configuracion"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=ConfiguracionPlan)
def obtener_configuracion(db: Session = Depends(get_db)) -> ConfiguracionPlan:
    return to_configuracion(get_or_create_configuracion(db))


@router.put("", response_model=ConfiguracionPlan)
def actualizar_configuracion(
    payload: ConfiguracionPlan,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ConfiguracionPlan:
    configuracion = get_or_create_configuracion(db)
    configuracion.cantidad_cuotas = payload.cantidad_cuotas
    configuracion.cantidad_de_adherentes = payload.cantidad_de_adherentes
    configuracion.metros_cuadrados_vivienda = payload.metros_cuadrados_vivienda
    configuracion.valor_por_m2 = payload.valor_por_m2
    configuracion.duracion_construccion_meses = payload.duracion_construccion_meses
    configuracion.tipo_cambio = payload.tipo_cambio
    db.commit()
    db.refresh(configuracion)
    return to_configuracion(configuracion)


@router.get("/resumen-financiero")
def obtener_resumen_financiero(db: Session = Depends(get_db)):
    configuracion = to_configuracion(get_or_create_configuracion(db))
    estado = get_or_create_estado_plan(db)
    adherentes = [to_adherente(item) for item in db.query(AdherenteDB).all()]
    return construir_resumen_financiero(
        fondo_ars=estado.fondo_ars,
        adherentes=adherentes,
        config=configuracion,
    )
