from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import AdherenteDB, PagoDB, get_or_create_estado_plan, to_pago
from app.models.pago import Pago, PagoCreate
from app.services.security import get_current_user, require_operator_or_admin

router = APIRouter(
    prefix="/pagos",
    tags=["Pagos"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[Pago])
def listar_pagos(db: Session = Depends(get_db)) -> list[Pago]:
    pagos = db.query(PagoDB).order_by(PagoDB.id).all()
    return [to_pago(item) for item in pagos]


@router.post("", response_model=Pago)
def registrar_pago(
    payload: PagoCreate,
    _: object = Depends(require_operator_or_admin),
    db: Session = Depends(get_db),
) -> Pago:
    adherente = db.get(AdherenteDB, payload.adherente_id)
    if adherente is None:
        raise HTTPException(status_code=404, detail="Adherente no encontrado")

    pago = PagoDB(
        adherente_id=payload.adherente_id,
        monto_ars=payload.monto_ars,
        mes=payload.mes,
        fecha=datetime.now(),
    )
    db.add(pago)

    estado_plan = get_or_create_estado_plan(db)
    estado_plan.fondo_ars += payload.monto_ars
    adherente.cuotas_pagadas += 1
    db.commit()
    db.refresh(pago)
    return to_pago(pago)
