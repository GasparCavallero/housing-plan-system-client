from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import AdherenteDB, to_adherente
from app.models.adherente import Adherente, AdherenteCreate, EstadoAdherente
from app.services.security import get_current_user, require_operator_or_admin

router = APIRouter(
    prefix="/adherentes",
    tags=["Adherentes"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[Adherente])
def listar_adherentes(db: Session = Depends(get_db)) -> list[Adherente]:
    return [
        to_adherente(item)
        for item in db.query(AdherenteDB).order_by(AdherenteDB.id).all()
    ]


@router.post("", response_model=Adherente)
def crear_adherente(
    payload: AdherenteCreate,
    _: object = Depends(require_operator_or_admin),
    db: Session = Depends(get_db),
) -> Adherente:
    adherente = AdherenteDB(
        nombre=payload.nombre,
        estado=EstadoAdherente.ACTIVO.value,
    )
    db.add(adherente)
    db.commit()
    db.refresh(adherente)
    return to_adherente(adherente)


@router.patch("/{adherente_id}/estado", response_model=Adherente)
def actualizar_estado(
    adherente_id: int,
    estado: EstadoAdherente,
    _: object = Depends(require_operator_or_admin),
    db: Session = Depends(get_db),
) -> Adherente:
    adherente = db.get(AdherenteDB, adherente_id)
    if adherente is not None:
        adherente.estado = estado.value
        db.commit()
        db.refresh(adherente)
        return to_adherente(adherente)
    raise HTTPException(status_code=404, detail="Adherente no encontrado")
