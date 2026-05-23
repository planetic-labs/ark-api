import pytest
from sqlalchemy import select
from backend.modules.users.models import User, Role, Permission
from backend.modules.auth.models import RefreshToken
from backend.core.redis import get_auth_code, set_setup_token
from backend.core.security import create_access_token, hash_token

@pytest.mark.asyncio
async def test_auth_identify(client, db):
    # Setup: Create a registered user
    role = Role(name="student", is_default=True)
    db.add(role)
    user = User(
        email="test@ark.com",
        status="created",
        is_active=True,
        is_approved=False
    )
    user.roles.append(role)
    db.add(user)
    await db.commit()

    # Identify existing email
    response = await client.post("/api/v1/auth/identify", json={"email": "test@ark.com"})
    assert response.status_code == 200
    assert response.json() == {"next": "enter_code"}

    # Check that code was stored in Redis
    code = await get_auth_code("test@ark.com")
    assert code is not None
    assert len(code) == 6

    # Identify non-existent email
    response = await client.post("/api/v1/auth/identify", json={"email": "unknown@ark.com"})
    assert response.status_code == 200
    assert response.json() == {"error": "not_found"}

    # Identify disabled email
    disabled_user = User(
        email="disabled@ark.com",
        status="disabled",
        is_active=True
    )
    db.add(disabled_user)
    await db.commit()

    response = await client.post("/api/v1/auth/identify", json={"email": "disabled@ark.com"})
    assert response.status_code == 200
    assert response.json() == {"error": "not_found"}

@pytest.mark.asyncio
async def test_auth_verify_code(client, db):
    # Setup roles and user
    role = Role(name="student", is_default=True)
    db.add(role)
    user_created = User(
        email="created@ark.com",
        status="created",
        is_active=True
    )
    user_created.roles.append(role)
    
    user_active = User(
        email="active@ark.com",
        status="active",
        is_active=True
    )
    user_active.roles.append(role)
    
    db.add(user_created)
    db.add(user_active)
    await db.commit()

    # Get codes
    await client.post("/api/v1/auth/identify", json={"email": "created@ark.com"})
    code_created = await get_auth_code("created@ark.com")

    await client.post("/api/v1/auth/identify", json={"email": "active@ark.com"})
    code_active = await get_auth_code("active@ark.com")

    # Verify code for 'created' user -> transition to setup_profile
    response = await client.post("/api/v1/auth/verify-code", json={
        "email": "created@ark.com",
        "code": code_created
    })
    assert response.status_code == 200
    data = response.json()
    assert data["next"] == "setup_profile"
    assert data["setup_token"] is not None

    # Verify code for 'active' user -> direct login (home)
    response = await client.post("/api/v1/auth/verify-code", json={
        "email": "active@ark.com",
        "code": code_active
    })
    assert response.status_code == 200
    data = response.json()
    assert data["next"] == "home"
    assert data["access_token"] is not None
    assert data["refresh_token"] is not None

    # Verify with invalid code -> 401
    response = await client.post("/api/v1/auth/verify-code", json={
        "email": "active@ark.com",
        "code": "000000"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_auth_setup(client, db):
    # Setup default role and user
    role = Role(name="student", is_default=True)
    db.add(role)
    user = User(
        email="setup@ark.com",
        status="created",
        is_active=True
    )
    db.add(user)
    await db.commit()

    # Pre-set setup token in Redis
    setup_token = "some-hex-setup-token"
    await set_setup_token(setup_token, user.id)

    # Post setup profile data
    response = await client.post("/api/v1/auth/setup", json={
        "setup_token": setup_token,
        "name": "Jane Doe",
        "avatar_url": "http://avatar.com/jane"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] is not None
    assert data["refresh_token"] is not None

    # Reload user from DB and assert profile changes
    db.expire_all()
    
    result = await db.execute(select(User).where(User.email == "setup@ark.com"))
    updated_user = result.scalar_one()
    assert updated_user.status == "active"
    assert updated_user.name == "Jane Doe"
    assert updated_user.avatar_url == "http://avatar.com/jane"
    assert any(r.name == "student" for r in updated_user.roles)

@pytest.mark.asyncio
async def test_auth_refresh(client, db):
    # Setup: Create active user and seed RefreshToken
    role = Role(name="student", is_default=True)
    db.add(role)
    user = User(
        email="refresh@ark.com",
        status="active",
        is_active=True
    )
    user.roles.append(role)
    db.add(user)
    await db.commit()

    import ulid
    from datetime import datetime, timedelta, timezone
    
    refresh_token_id = str(ulid.ULID())
    refresh_token_str = "initial-refresh-token-string-hex-32"
    refresh_token_hash = hash_token(refresh_token_str)
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    db_token = RefreshToken(
        id=refresh_token_id,
        token_hash=refresh_token_hash,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(db_token)
    await db.commit()

    # Trigger refresh
    response = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token_str
    })
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] is not None
    assert data["refresh_token"] is not None
    assert data["refresh_token"] != refresh_token_str

    # Assert old token is deleted and new token is stored in DB
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == refresh_token_hash))
    assert result.scalar_one_or_none() is None

    new_hash = hash_token(data["refresh_token"])
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == new_hash))
    assert result.scalar_one_or_none() is not None

@pytest.mark.asyncio
async def test_auth_logout(client, db):
    # Setup
    role = Role(name="student", is_default=True)
    db.add(role)
    user = User(
        email="logout@ark.com",
        status="active",
        is_active=True
    )
    user.roles.append(role)
    db.add(user)
    await db.commit()

    import ulid
    from datetime import datetime, timedelta, timezone
    
    refresh_token_id = str(ulid.ULID())
    refresh_token_str = "logout-refresh-token-string"
    refresh_token_hash = hash_token(refresh_token_str)
    
    db_token = RefreshToken(
        id=refresh_token_id,
        token_hash=refresh_token_hash,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(db_token)
    await db.commit()

    # Generate access token pointing to this refresh token session
    access_token = create_access_token(
        subject=user.id,
        roles=["student"],
        status=user.status,
        jti=refresh_token_id
    )

    # Logout
    response = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}

    # Assert token revoked from DB
    result = await db.execute(select(RefreshToken).where(RefreshToken.id == refresh_token_id))
    assert result.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_rbac_permissions(client, db):
    # Create two users: student and admin
    admin_role = Role(name="admin", is_system=True)
    student_role = Role(name="student", is_default=True)
    
    # Give a custom permission to student
    custom_perm = Permission(key="read_logs", description="Can read logs")
    student_role.permissions.append(custom_perm)
    
    db.add(admin_role)
    db.add(student_role)
    db.add(custom_perm)
    
    admin_user = User(email="admin-user@ark.com", status="active", is_approved=True, is_active=True)
    admin_user.roles.append(admin_role)
    
    student_user = User(email="student-user@ark.com", status="active", is_approved=True, is_active=True)
    student_user.roles.append(student_role)
    
    db.add(admin_user)
    db.add(student_user)
    await db.commit()

    # Generate tokens
    admin_token = create_access_token(subject=admin_user.id, roles=["admin"], status="active")
    student_token = create_access_token(subject=student_user.id, roles=["student"], status="active")

    # Try creating user as student -> 403 Forbidden (require_role("admin"))
    response = await client.post(
        "/api/v1/users/",
        json={
            "email": "new-from-test@ark.com",
            "full_name": "New User",
            "role": "student",
            "is_active": True,
            "is_approved": True
        },
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403

    # Try creating user as admin -> 201 Created
    response = await client.post(
        "/api/v1/users/",
        json={
            "email": "new-from-test@ark.com",
            "full_name": "New User",
            "role": "student",
            "is_active": True,
            "is_approved": True
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 201

@pytest.mark.asyncio
async def test_approved_user_restriction(client, db):
    # Create an unapproved user
    role = Role(name="student", is_default=True)
    db.add(role)
    user = User(
        email="unapproved@ark.com",
        status="active",
        is_approved=False,
        is_active=True
    )
    user.roles.append(role)
    db.add(user)
    await db.commit()

    token = create_access_token(subject=user.id, roles=["student"], status="active")

    # Access /api/v1/users/ -> 403 Forbidden
    response = await client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "User account not approved by administrator"

    # Access /api/v1/messaging/chats -> 403 Forbidden
    response = await client.get(
        "/api/v1/messaging/chats",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "User account not approved by administrator"

    # Access /api/v1/users/me -> 200 OK (unapproved users can view their own profile/status)
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "unapproved@ark.com"
