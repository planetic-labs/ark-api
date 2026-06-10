import base64
import hashlib
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from core.config import settings

ALGORITHM = "RS256"

# Try loading persistent keys for development fallback, otherwise generate once and save
_key_dir = Path(__file__).resolve().parents[1] / ".keys"
_private_key_path = _key_dir / "private.pem"
_public_key_path = _key_dir / "public.pem"

_temp_private_pem = ""
_temp_public_pem = ""

if _private_key_path.exists() and _public_key_path.exists():
    try:
        _temp_private_pem = _private_key_path.read_text(encoding="utf-8")
        _temp_public_pem = _public_key_path.read_text(encoding="utf-8")
    except Exception:
        pass

if not _temp_private_pem or not _temp_public_pem:
    _temp_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    _temp_private_pem = _temp_private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    _temp_public_pem = (
        _temp_private_key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("utf-8")
    )

    try:
        _key_dir.mkdir(parents=True, exist_ok=True)
        _private_key_path.write_text(_temp_private_pem, encoding="utf-8")
        _public_key_path.write_text(_temp_public_pem, encoding="utf-8")
    except Exception:
        pass


def get_private_key() -> str:
    return settings.JWT_PRIVATE_KEY or _temp_private_pem


def get_public_key() -> str:
    return settings.JWT_PUBLIC_KEY or _temp_public_pem


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


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, get_public_key(), algorithms=[ALGORITHM])


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
