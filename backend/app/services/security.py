import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.auth_models import RefreshToken, User
from app.database.connection import get_db
from app.models.auth import TokenPayload

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    subject: str, role: str, expires_delta: timedelta | None = None
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": subject, "role": role, "type": "access", "exp": expire}
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def create_refresh_token(subject: str, role: str) -> tuple[str, datetime]:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    payload = {"sub": subject, "role": role, "type": "refresh", "exp": expire}
    token = jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )
    return token, expire.replace(tzinfo=None)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def decode_token(token: str) -> TokenPayload:
    payload = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    return TokenPayload(
        sub=payload.get("sub"),
        role=payload.get("role"),
        type=payload.get("type"),
    )


def persist_refresh_token(
    db: Session, user_id: int, refresh_token: str, expires_at: datetime
) -> None:
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(refresh_token),
            expires_at=expires_at,
            revoked=False,
        )
    )
    db.commit()


def revoke_refresh_token(db: Session, refresh_token: str) -> bool:
    stored = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(refresh_token))
        .first()
    )
    if stored is None:
        return False
    stored.revoked = True
    db.commit()
    return True


def validate_refresh_token(db: Session, refresh_token: str) -> User:
    try:
        payload = decode_token(refresh_token)
    except JWTError as ex:
        raise HTTPException(status_code=401, detail="Refresh token inválido") from ex

    if payload.type != "refresh" or payload.sub is None:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    stored = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hash_token(refresh_token))
        .first()
    )
    if stored is None or stored.revoked or stored.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    user = db.query(User).filter(User.id == stored.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario inválido")
    return user


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded = decode_token(token)
        username = decoded.sub
        role = decoded.role
        if username is None or decoded.type != "access":
            raise credentials_exception
        TokenPayload(sub=username, role=role)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return current_user


def require_operator_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {"admin", "operador"}:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return current_user
