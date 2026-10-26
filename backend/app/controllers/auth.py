from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response, status
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.dependencies import CurrentUser, DbSession, business_error
from app.models import Session as UserSession
from app.models import User, UserRole
from app.schemas import (
    AddressInput,
    LoginRequest,
    RegisterRequest,
    UserPublic,
    normalize_email,
)
from app.utils.security import (
    create_session_token,
    hash_password,
    token_digest,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        nome_completo=user.nome_completo,
        telefone=user.telefone,
        email=user.email,
        perfil=user.perfil.value,
        ativo=user.ativo,
        endereco=AddressInput(
            cep=user.cep,
            logradouro=user.logradouro,
            numero=user.numero,
            complemento=user.complemento,
            bairro=user.bairro,
            cidade=user.cidade,
            uf=user.uf,
        ),
    )


def attach_session_cookie(response: Response, token: str, expires_at: datetime) -> None:
    remaining = max(0, int((expires_at - datetime.now(timezone.utc)).total_seconds()))
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=remaining,
        path="/",
    )


@router.post(
    "/register", status_code=status.HTTP_201_CREATED, response_model=UserPublic
)
def register(payload: RegisterRequest, response: Response, db: DbSession) -> UserPublic:
    email = normalize_email(str(payload.email))
    user = User(
        nome_completo=payload.nome_completo,
        telefone=payload.telefone,
        email=email,
        senha_hash=hash_password(payload.senha),
        perfil=UserRole.CLIENTE,
        cep=payload.endereco.cep,
        logradouro=payload.endereco.logradouro,
        numero=payload.endereco.numero,
        complemento=payload.endereco.complemento,
        bairro=payload.endereco.bairro,
        cidade=payload.endereco.cidade,
        uf=payload.endereco.uf,
    )
    db.add(user)
    try:
        db.flush()
        token, digest, expires_at = create_session_token()
        db.add(UserSession(usuario_id=user.id, token_hash=digest, expira_em=expires_at))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise business_error(
            status.HTTP_409_CONFLICT,
            "EMAIL_ALREADY_EXISTS",
            "Este e-mail já possui cadastro.",
        ) from exc
    db.refresh(user)
    attach_session_cookie(response, token, expires_at)
    response.headers["Cache-Control"] = "no-store"
    return user_public(user)


@router.post("/login", response_model=UserPublic)
def login(payload: LoginRequest, response: Response, db: DbSession) -> UserPublic:
    user = (
        db.query(User).filter(User.email == normalize_email(str(payload.email))).first()
    )
    if (
        user is None
        or not user.ativo
        or not verify_password(payload.senha, user.senha_hash)
    ):
        raise business_error(
            status.HTTP_401_UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "E-mail ou senha inválidos.",
        )
    token, digest, expires_at = create_session_token()
    db.add(UserSession(usuario_id=user.id, token_hash=digest, expira_em=expires_at))
    db.commit()
    attach_session_cookie(response, token, expires_at)
    response.headers["Cache-Control"] = "no-store"
    return user_public(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: DbSession) -> Response:
    raw_token = request.cookies.get(settings.session_cookie_name)
    session = None
    if raw_token:
        session = (
            db.query(UserSession)
            .filter(UserSession.token_hash == token_digest(raw_token))
            .first()
        )
    if session is not None and session.revogada_em is None:
        session.revogada_em = datetime.now(timezone.utc)
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


@router.get("/me", response_model=UserPublic)
def me(user: CurrentUser, response: Response) -> UserPublic:
    response.headers["Cache-Control"] = "no-store"
    return user_public(user)
