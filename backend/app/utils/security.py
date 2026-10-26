from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import (
    InvalidHashError,
    VerificationError,
    VerifyMismatchError,
)

pwd_hasher = PasswordHasher()
SESSION_DURATION = timedelta(hours=8)


def hash_password(password: str) -> str:
    return pwd_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def create_session_token() -> tuple[str, str, datetime]:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + SESSION_DURATION
    return token, token_hash, expires_at


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
