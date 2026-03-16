from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.database.connection import Base
from app.models.adherente import Adherente, EstadoAdherente
from app.models.pago import Pago
from app.models.plan import (
    ConfiguracionPlan,
    EstadoPlan,
    MetodoAdjudicacion,
    ViviendaEnConstruccion,
)


class PlanConfiguracionDB(Base):
    __tablename__ = "plan_configuracion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cantidad_cuotas: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_de_adherentes: Mapped[int] = mapped_column(Integer, nullable=False)
    metros_cuadrados_vivienda: Mapped[float] = mapped_column(Float, nullable=False)
    valor_por_m2: Mapped[float] = mapped_column(Float, nullable=False)
    duracion_construccion_meses: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo_cambio: Mapped[float] = mapped_column(Float, nullable=False)


class PlanEstadoDB(Base):
    __tablename__ = "plan_estado"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mes_actual: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fondo_ars: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    casas_iniciadas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    casas_entregadas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class AdherenteDB(Base):
    __tablename__ = "adherentes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(30), nullable=False, default=EstadoAdherente.ACTIVO.value
    )
    cuotas_pagadas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cuotas_bonificadas_por_licitacion: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )


class PagoDB(Base):
    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    adherente_id: Mapped[int] = mapped_column(
        ForeignKey("adherentes.id"), nullable=False, index=True
    )
    monto_ars: Mapped[float] = mapped_column(Float, nullable=False)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )


class ViviendaEnConstruccionDB(Base):
    __tablename__ = "viviendas_en_construccion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    adherente_id: Mapped[int] = mapped_column(
        ForeignKey("adherentes.id"), nullable=False, index=True
    )
    mes_inicio: Mapped[int] = mapped_column(Integer, nullable=False)
    mes_fin: Mapped[int] = mapped_column(Integer, nullable=False)
    metodo: Mapped[str] = mapped_column(String(20), nullable=False)


def get_or_create_configuracion(db: Session) -> PlanConfiguracionDB:
    configuracion = db.get(PlanConfiguracionDB, 1)
    if configuracion is None:
        defaults = ConfiguracionPlan()
        configuracion = PlanConfiguracionDB(
            id=1,
            cantidad_cuotas=defaults.cantidad_cuotas,
            cantidad_de_adherentes=defaults.cantidad_de_adherentes,
            metros_cuadrados_vivienda=defaults.metros_cuadrados_vivienda,
            valor_por_m2=defaults.valor_por_m2,
            duracion_construccion_meses=defaults.duracion_construccion_meses,
            tipo_cambio=defaults.tipo_cambio,
        )
        db.add(configuracion)
        db.commit()
        db.refresh(configuracion)
    return configuracion


def get_or_create_estado_plan(db: Session) -> PlanEstadoDB:
    estado = db.get(PlanEstadoDB, 1)
    if estado is None:
        estado = PlanEstadoDB(id=1)
        db.add(estado)
        db.commit()
        db.refresh(estado)
    return estado


def to_configuracion(model: PlanConfiguracionDB) -> ConfiguracionPlan:
    return ConfiguracionPlan(
        cantidad_cuotas=model.cantidad_cuotas,
        cantidad_de_adherentes=model.cantidad_de_adherentes,
        metros_cuadrados_vivienda=model.metros_cuadrados_vivienda,
        valor_por_m2=model.valor_por_m2,
        duracion_construccion_meses=model.duracion_construccion_meses,
        tipo_cambio=model.tipo_cambio,
    )


def to_adherente(model: AdherenteDB) -> Adherente:
    return Adherente(
        id=model.id,
        nombre=model.nombre,
        estado=EstadoAdherente(model.estado),
        cuotas_pagadas=model.cuotas_pagadas,
        cuotas_bonificadas_por_licitacion=model.cuotas_bonificadas_por_licitacion,
    )


def to_pago(model: PagoDB) -> Pago:
    return Pago(
        id=model.id,
        adherente_id=model.adherente_id,
        monto_ars=model.monto_ars,
        mes=model.mes,
        fecha=model.fecha,
    )


def to_vivienda(model: ViviendaEnConstruccionDB) -> ViviendaEnConstruccion:
    return ViviendaEnConstruccion(
        adherente_id=model.adherente_id,
        mes_inicio=model.mes_inicio,
        mes_fin=model.mes_fin,
        metodo=MetodoAdjudicacion(model.metodo),
    )


def to_estado_plan(
    estado: PlanEstadoDB,
    construcciones: list[ViviendaEnConstruccionDB],
) -> EstadoPlan:
    return EstadoPlan(
        mes_actual=estado.mes_actual,
        fondo_ars=estado.fondo_ars,
        casas_iniciadas=estado.casas_iniciadas,
        casas_entregadas=estado.casas_entregadas,
        construcciones=[to_vivienda(item) for item in construcciones],
    )
