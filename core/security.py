import base64
import hashlib
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import structlog
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from pydantic import BaseModel

from core.config import settings

ALGORITHM = "RS256"


logger = structlog.get_logger()

# Try loading persistent keys for development fallback, otherwise generate once and save
_key_dir = Path(__file__).resolve().parents[1] / ".keys"
_private_key_path = _key_dir / "private.pem"
_public_key_path = _key_dir / "public.pem"


def _load_or_generate_keys() -> tuple[str, str]:
    """В production ключи ОБЯЗАТЕЛЬНО через env vars."""
    # 1. Приоритет — переменные окружения
    if settings.JWT_PRIVATE_KEY and settings.JWT_PUBLIC_KEY:
        return settings.JWT_PRIVATE_KEY, settings.JWT_PUBLIC_KEY

    # 2. Файлы на диске
    if _private_key_path.exists() and _public_key_path.exists():
        try:
            private_pem = _private_key_path.read_text(encoding="utf-8")
            public_pem = _public_key_path.read_text(encoding="utf-8")
            logger.info("RSA keys loaded from disk")
            return private_pem, public_pem
        except Exception as e:
            logger.error("Failed to read RSA keys from disk", error=str(e))

    # 3. Генерация (только для dev)
    if not settings.DEBUG:
        raise RuntimeError(
            "RSA keys not found. Set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY env vars."
        )

    logger.warning("Generating new RSA keys for development")
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_pem = (
        private_key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("utf-8")
    )

    try:
        _key_dir.mkdir(parents=True, exist_ok=True)
        _private_key_path.write_text(private_pem, encoding="utf-8")
        os.chmod(_private_key_path, 0o600)  # Только владелец
        _public_key_path.write_text(public_pem, encoding="utf-8")
    except Exception as e:
        logger.error("Failed to save generated keys to disk", error=str(e))

    return private_pem, public_pem


_PRIVATE_PEM, _PUBLIC_PEM = _load_or_generate_keys()


def get_private_key() -> str:
    return _PRIVATE_PEM


def get_public_key() -> str:
    return _PUBLIC_PEM


def get_kid() -> str:
    pub_key = get_public_key()
    return hashlib.sha256(pub_key.encode("utf-8")).hexdigest()[:16]


def create_access_token(
    subject: str,
    roles: list[str],
    status: str,
    jti: str | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(seconds=settings.JWT_ACCESS_TTL)

    # Payload format from GEMINI.md:
    # { "sub": "<user_id>", "roles": ["student"], "status": "active", "exp": <unix> }
    to_encode = {
        "exp": int(expire.timestamp()),
        "sub": str(subject),
        "roles": roles,
        "status": status,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    if jti:
        to_encode["jti"] = jti

    encoded_jwt = jwt.encode(
        to_encode, get_private_key(), algorithm=ALGORITHM, headers={"kid": get_kid()}
    )
    return encoded_jwt


def create_refresh_token() -> str:
    # Generate cryptographically secure refresh token string
    # GEMINI.md: "refresh token — непрозрачная строка, sha256 в refresh_tokens."
    import secrets

    return secrets.token_hex(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class TokenPayload(BaseModel):
    sub: str
    roles: list[str]
    status: str
    exp: int
    jti: str | None = None


def decode_token(token: str) -> TokenPayload:
    raw = jwt.decode(
        token,
        get_public_key(),
        algorithms=[ALGORITHM],
        audience=settings.JWT_AUDIENCE,
        issuer=settings.JWT_ISSUER,
    )
    return TokenPayload.model_validate(raw)


def get_jwks() -> dict:
    from cryptography.hazmat.primitives import serialization

    public_key = serialization.load_pem_public_key(get_public_key().encode())
    if not isinstance(public_key, rsa.RSAPublicKey):
        raise ValueError("Key is not an RSA public key")

    numbers = public_key.public_numbers()

    def b64url(val: int) -> str:
        val_bytes = val.to_bytes((val.bit_length() + 7) // 8, byteorder="big")
        return (
            base64.urlsafe_b64encode(val_bytes)
            .decode("utf-8")
            .rstrip("=")
            .replace("\n", "")
        )

    jwk = {
        "kty": "RSA",
        "alg": "RS256",
        "use": "sig",
        "kid": get_kid(),
        "n": b64url(numbers.n),
        "e": b64url(numbers.e),
    }
    return {"keys": [jwk]}
