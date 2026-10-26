from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response, status

from app.config import settings
from app.controllers.auth import user_public
from app.dependencies import CurrentUser, DbSession, business_error
from app.models import Session as UserSession
from app.schemas import PasswordUpdateRequest, UserUpdateRequest
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["Usuários"])


@router.patch("/me")
def update_me(
    payload: UserUpdateRequest,
    user: CurrentUser,
    response: Response,
    db: DbSession,
) -> dict[str, object]:
    if payload.nome_completo is not None:
        user.nome_completo = payload.nome_completo
    if payload.telefone is not None:
        user.telefone = payload.telefone
    if payload.endereco is not None:
        user.cep = payload.endereco.cep
        user.logradouro = payload.endereco.logradouro
        user.numero = payload.endereco.numero
        user.complemento = payload.endereco.complemento
        user.bairro = payload.endereco.bairro
        user.cidade = payload.endereco.cidade
        user.uf = payload.endereco.uf
    db.commit()
    db.refresh(user)
    response.headers["Cache-Control"] = "no-store"
    return user_public(user).model_dump()


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordUpdateRequest,
    request: Request,
    response: Response,
    user: CurrentUser,
    db: DbSession,
) -> Response:
    if not verify_password(payload.senha_atual, user.senha_hash):
        raise business_error(
            status.HTTP_400_BAD_REQUEST,
            "INVALID_CURRENT_PASSWORD",
            "A senha atual não confere.",
        )
    if payload.senha_atual == payload.nova_senha:
        raise business_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "A nova senha deve ser diferente da senha atual.",
        )
    user.senha_hash = hash_password(payload.nova_senha)
    now = datetime.now(timezone.utc)
    db.query(UserSession).filter(
        UserSession.usuario_id == user.id,
        UserSession.revogada_em.is_(None),
    ).update({UserSession.revogada_em: now}, synchronize_session=False)
    db.commit()
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
