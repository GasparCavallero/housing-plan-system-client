from fastapi import FastAPI
from sqlalchemy import inspect

from app.config.settings import settings
from app.database.auth_models import User
from app.database.connection import SessionLocal, engine
from app.database.models import get_or_create_configuracion, get_or_create_estado_plan
from app.routes.auth import router as auth_router
from app.routes.adherentes import router as adherentes_router
from app.routes.configuracion import router as configuracion_router
from app.routes.pagos import router as pagos_router
from app.routes.planes import router as planes_router
from app.services.security import get_password_hash

app = FastAPI(title="Housing Plan System", version="0.1.0")

REQUIRED_TABLES = {
    "users",
    "refresh_tokens",
    "plan_configuracion",
    "plan_estado",
    "adherentes",
    "pagos",
    "viviendas_en_construccion",
}


@app.get("/")
def healthcheck():
    return {"status": "ok", "service": "housing-plan-system"}


@app.on_event("startup")
def on_startup():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    missing_tables = sorted(REQUIRED_TABLES - existing_tables)
    if missing_tables:
        missing = ", ".join(missing_tables)
        raise RuntimeError(
            "Faltan tablas de base de datos. Ejecuta las migraciones de Alembic antes de iniciar la app. "
            f"Tablas faltantes: {missing}"
        )

    db = SessionLocal()
    try:
        get_or_create_configuracion(db)
        get_or_create_estado_plan(db)
        admin = (
            db.query(User)
            .filter(User.username == settings.bootstrap_admin_username)
            .first()
        )
        if admin is None:
            db.add(
                User(
                    username=settings.bootstrap_admin_username,
                    hashed_password=get_password_hash(
                        settings.bootstrap_admin_password
                    ),
                    role="admin",
                    is_active=True,
                )
            )
            db.commit()
    finally:
        db.close()


app.include_router(auth_router)
app.include_router(configuracion_router)
app.include_router(adherentes_router)
app.include_router(pagos_router)
app.include_router(planes_router)
