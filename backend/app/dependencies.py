from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Session as UserSession
from app.models import User, UserRole


def business_error(
    http_status: int,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
) -> HTTPException:
    return HTTPException(
        status_code=http_status,
        detail={"code": code, "message": message, "details": details or {}},
    )


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise business_error(
            status.HTTP_401_UNAUTHORIZED,
            "UNAUTHENTICATED",
            "Autenticação necessária.",
        )

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.token_hash == token_hash,
            UserSession.revogada_em.is_(None),
            UserSession.expira_em > now,
        )
        .first()
    )
    if session is None or not session.usuario.ativo:
        raise business_error(
            status.HTTP_401_UNAUTHORIZED,
            "UNAUTHENTICATED",
            "Sessão inválida ou expirada.",
        )
    request.state.user_session = session
    return session.usuario


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.perfil != UserRole.ADMIN:
        raise business_error(
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN",
            "Acesso exclusivo para administradores.",
        )
    return user


def require_client(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.perfil != UserRole.CLIENTE:
        raise business_error(
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN",
            "Esta operação é exclusiva para clientes.",
        )
    return user


DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
ClientUser = Annotated[User, Depends(require_client)]
