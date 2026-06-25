from pydantic import BaseModel, Field


class CursorParams(BaseModel):
    cursor: str | None = Field(None, description="ULID курсор")
    limit: int = Field(50, ge=1, le=100)


class CursorPage[T](BaseModel):
    items: list[T]
    next_cursor: str | None = None
    has_more: bool = False
