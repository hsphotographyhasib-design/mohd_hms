"""Pagination utilities for PostgREST range-based pagination.

MOHD.HMS ENTERPRISE

PostgREST uses HTTP Range headers for pagination:
  Range: 0-24  →  first 25 rows
  Content-Range: 0-24/100  →  rows 0-24 out of 100 total

This module provides:
  - PaginationParams: parsed and validated pagination parameters
  - PaginatedResponse: standard response envelope
  - apply_pagination: build Range header and parse Content-Range response
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import Query, Request

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 25


@dataclass(slots=True)
class PaginationParams:
    """Parsed and validated pagination parameters."""
    page: int = 1
    page_size: int = DEFAULT_PAGE_SIZE

    @property
    def offset(self) -> int:
        """Row offset (0-indexed)."""
        return (self.page - 1) * self.page_size

    @property
    def range_header(self) -> str:
        """HTTP Range header value for PostgREST.

        E.g. "0-24" for the first 25 rows.
        """
        start = self.offset
        end = start + self.page_size - 1
        return f"{start}-{end}"

    @property
    def prefer_header(self) -> str:
        """Prefer header for PostgREST count.

        Includes 'return=representation' so rows are returned alongside the count.
        """
        return "count=exact,return=representation"


@dataclass(slots=True)
class PaginatedResponse:
    """Standard paginated response envelope.

    Shape:
    {
        "success": true,
        "data": [...],
        "pagination": {
            "page": 1,
            "page_size": 25,
            "total": 100,
            "total_pages": 4
        }
    }
    """
    data: list[Any]
    total: int
    page: int
    page_size: int

    @property
    def total_pages(self) -> int:
        if self.total == 0:
            return 0
        return (self.total + self.page_size - 1) // self.page_size

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": True,
            "data": self.data,
            "pagination": {
                "page": self.page,
                "page_size": self.page_size,
                "total": self.total,
                "total_pages": self.total_pages,
            },
        }


def parse_pagination_params(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(
        default=DEFAULT_PAGE_SIZE,
        ge=1,
        le=MAX_PAGE_SIZE,
        alias="pageSize",
        description=f"Items per page (max {MAX_PAGE_SIZE})",
    ),
) -> PaginationParams:
    """FastAPI dependency for parsing pagination query params.

    Usage in route handlers::

        @router.get("/complaints")
        async def list_complaints(
            pagination: PaginationParams = Depends(parse_pagination_params),
        ): ...
    """
    return PaginationParams(page=page, page_size=page_size)


def parse_pagination_from_request(request: Request) -> PaginationParams:
    """Parse pagination from query params without FastAPI dependency injection.

    Useful in non-route code that has a Request object.
    """
    page = int(request.query_params.get("page", 1))
    page_size = int(request.query_params.get("pageSize", request.query_params.get("page_size", DEFAULT_PAGE_SIZE)))

    # Clamp values
    page = max(1, page)
    page_size = max(1, min(MAX_PAGE_SIZE, page_size))

    return PaginationParams(page=page, page_size=page_size)


def build_range_headers(params: PaginationParams) -> dict[str, str]:
    """Build HTTP headers for a PostgREST paginated request.

    Returns:
        Dict with 'Range' and 'Prefer' headers.
    """
    return {
        "Range": params.range_header,
        "Prefer": params.prefer_header,
    }


def parse_content_range(content_range: str) -> tuple[int, int, int | None]:
    """Parse a PostgREST Content-Range header.

    Expected format: "0-24/100" or "0-24/*"

    Returns:
        (start, end, total_or_None)
    """
    try:
        range_part, total_part = content_range.split("/")
        start_str, end_str = range_part.split("-")
        total = int(total_part) if total_part != "*" else None
        return int(start_str), int(end_str), total
    except (ValueError, AttributeError):
        return 0, 0, None


class CursorPaginationParams:
    """Cursor-based pagination (optional, for large datasets).

    Uses the 'created_at' column + 'id' for stable ordering.
    Pass `cursor` query param (base64-encoded last row id + created_at).
    """

    def __init__(
        self,
        cursor: str | None = None,
        page_size: int = DEFAULT_PAGE_SIZE,
        direction: str = "next",
    ) -> None:
        self.cursor = cursor
        self.page_size = min(MAX_PAGE_SIZE, max(1, page_size))
        self.direction = direction

        self._decoded_cursor: tuple[str, str] | None = None
        if cursor:
            try:
                import base64
                decoded = base64.b64decode(cursor).decode("utf-8")
                parts = decoded.split("|")
                if len(parts) == 2:
                    self._decoded_cursor = (parts[0], parts[1])  # (id, created_at)
            except Exception:
                self._decoded_cursor = None

    @property
    def decoded_cursor(self) -> tuple[str, str] | None:
        return self._decoded_cursor

    @property
    def has_cursor(self) -> bool:
        return self._decoded_cursor is not None

    def build_filters(self) -> dict[str, Any]:
        """Build PostgREST filters for cursor pagination."""
        if not self._decoded_cursor:
            return {}

        row_id, created_at = self._decoded_cursor
        if self.direction == "next":
            return {
                "OR": [
                    {"createdAt": {"gt": created_at}},
                    {"AND": [{"createdAt": {"eq": created_at}}, {"id": {"gt": row_id}}]},
                ]
            }
        else:  # prev
            return {
                "OR": [
                    {"createdAt": {"lt": created_at}},
                    {"AND": [{"createdAt": {"eq": created_at}}, {"id": {"lt": row_id}}]},
                ]
            }

    @staticmethod
    def encode_cursor(row_id: str, created_at: str) -> str:
        """Encode a row into a cursor string."""
        import base64
        return base64.b64encode(f"{row_id}|{created_at}".encode("utf-8")).decode("utf-8")
