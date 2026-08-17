"""Supabase integration — high-level async client wrapping httpx.

MOHD.HMS ENTERPRISE

This module provides an AsyncSupabaseClient that wraps httpx.AsyncClient
with PostgREST-fluent methods, storage operations, and health checking.

This complements (but does not replace) the lower-level database.py module.
The database.py module is used by core CRUD helpers; this integration
client is for direct use by feature modules that need more control.

Singleton access via get_supabase().
"""

from __future__ import annotations

from typing import Any, Literal

import httpx

from app.core.config import get_settings
from app.core.exceptions import AppException, InternalException, NotFoundException, ServiceUnavailableException
from app.core.logging import get_logger

log = get_logger(__name__)

# ── Singleton ──────────────────────────────────────────────────────────────────

_instance: AsyncSupabaseClient | None = None


def get_supabase() -> AsyncSupabaseClient:
    """Return the singleton AsyncSupabaseClient.

    Creates the client on first call. Raises InternalException if
    SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not configured.
    """
    global _instance
    if _instance is not None:
        return _instance

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise InternalException(
            message="Supabase URL and service role key are required",
            details={"setting": "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"},
        )

    _instance = AsyncSupabaseClient(
        url=settings.supabase_url,
        key=settings.supabase_service_role_key,
    )
    return _instance


async def close_supabase() -> None:
    """Close the singleton client. Call on app shutdown."""
    global _instance
    if _instance is not None:
        await _instance.close()
        _instance = None


# ── Client ─────────────────────────────────────────────────────────────────────


class AsyncSupabaseClient:
    """Async Supabase client wrapping httpx.AsyncClient.

    Provides PostgREST query building, CRUD operations,
    storage, and health checking.
    """

    def __init__(self, url: str, key: str) -> None:
        self._base_url = url.rstrip("/")
        self._key = key
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(30.0, connect=10.0),
        )

    async def close(self) -> None:
        """Close the underlying httpx client."""
        await self._client.aclose()

    def _headers(self, prefer: str | None = None) -> dict[str, str]:
        """Build request headers."""
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    @staticmethod
    def _build_filter_params(where: dict[str, Any]) -> list[tuple[str, str]]:
        """Convert a where dict to PostgREST query params.

        Returns list of (key, value) tuples.
        """
        from app.core.database import where_to_postgrest_filters
        return where_to_postgrest_filters(where)

    # ── Query ───────────────────────────────────────────────────────────────

    async def query(
        self,
        table: str,
        select: str = "*",
        where: dict[str, Any] | None = None,
        order: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        single: bool = False,
        count: Literal["exact", "planned", "estimated"] | None = None,
    ) -> dict[str, Any]:
        """Query a Supabase table via PostgREST.

        Args:
            table:  Table name (PascalCase or model name).
            select: PostgREST select string.
            where:  Dict of filters.
            order:  Order string, e.g. "createdAt.desc".
            limit:  Max rows.
            offset: Rows to skip.
            single: Return exactly one row (raises 406 if 0 or >1).
            count:  Include count header.

        Returns:
            Dict with 'data' (list) and optionally 'count'.
        """
        params: dict[str, str] = {"select": select}

        if where:
            filter_tuples = self._build_filter_params(where)
            for key, val in filter_tuples:
                params[key] = val

        if order:
            params["order"] = order

        # Build Prefer header
        prefer_parts: list[str] = []
        if single:
            prefer_parts.append("return=representation")
        if count:
            prefer_parts.append(f"count={count}")

        headers = self._headers(prefer=",".join(prefer_parts) if prefer_parts else None)

        # Pagination via Range header
        range_start = offset or 0
        if limit:
            headers["Range"] = f"{range_start}-{range_start + limit - 1}"

        try:
            response = await self._client.get(
                f"/rest/v1/{table}",
                params=params,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Supabase query failed: {exc}")
            raise InternalException(message="Database query failed") from exc

        if single and response.status_code == 406:
            raise NotFoundException(resource=table, message=f"No single record found in {table}")

        if response.status_code >= 400:
            log.error(f"Supabase query {response.status_code}: {response.text}")
            raise InternalException(message=f"Database error: {response.status_code}")

        result: dict[str, Any] = {"data": response.json()}

        # Extract count from Content-Range
        content_range = response.headers.get("content-range", "")
        if content_range and count:
            parts = content_range.split("/")
            if len(parts) == 2:
                result["count"] = parts[1]
        result["range"] = content_range

        return result

    # ── Insert ──────────────────────────────────────────────────────────────

    async def insert(
        self,
        table: str,
        data: dict[str, Any] | list[dict[str, Any]],
        returning: str = "representation",
    ) -> dict[str, Any] | list[dict[str, Any]]:
        """Insert record(s) into a table.

        Args:
            table:     Table name.
            data:      Record or list of records.
            returning: 'representation', 'minimal', or 'none'.

        Returns:
            The inserted record(s) (if returning=representation).
        """
        headers = self._headers(prefer=f"return={returning}")
        headers["Content-Type"] = "application/json"

        try:
            response = await self._client.post(
                f"/rest/v1/{table}",
                json=data,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Supabase insert failed: {exc}")
            raise InternalException(message="Database insert failed") from exc

        if response.status_code in (200, 201):
            result = response.json()
            return result[0] if isinstance(result, list) and isinstance(data, dict) else result

        if response.status_code == 409:
            from app.core.exceptions import ConflictException
            raise ConflictException(message=f"Record already exists in {table}")

        log.error(f"Supabase insert {response.status_code}: {response.text}")
        raise InternalException(message=f"Database insert error: {response.status_code}")

    # ── Update ──────────────────────────────────────────────────────────────

    async def update(
        self,
        table: str,
        id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        """Update a record by ID.

        Args:
            table: Table name.
            id:    Record ID.
            data:  Partial update data.

        Returns:
            The updated record.
        """
        headers = self._headers(prefer="return=representation")

        try:
            response = await self._client.patch(
                f"/rest/v1/{table}",
                params={"id": f"eq.{id}"},
                json=data,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Supabase update failed: {exc}")
            raise InternalException(message="Database update failed") from exc

        if response.status_code in (200, 204):
            if response.status_code == 204:
                return {"id": id}
            result = response.json()
            return result[0] if isinstance(result, list) else result

        if response.status_code == 404:
            raise NotFoundException(resource=table)

        log.error(f"Supabase update {response.status_code}: {response.text}")
        raise InternalException(message=f"Database update error: {response.status_code}")

    # ── Delete ──────────────────────────────────────────────────────────────

    async def delete(self, table: str, id: str) -> None:
        """Delete a record by ID.

        Args:
            table: Table name.
            id:    Record ID.
        """
        headers = self._headers()

        try:
            response = await self._client.delete(
                f"/rest/v1/{table}",
                params={"id": f"eq.{id}"},
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Supabase delete failed: {exc}")
            raise InternalException(message="Database delete failed") from exc

        if response.status_code in (200, 204):
            return

        if response.status_code == 404:
            raise NotFoundException(resource=table)

        log.error(f"Supabase delete {response.status_code}: {response.text}")
        raise InternalException(message=f"Database delete error: {response.status_code}")

    # ── Upsert ──────────────────────────────────────────────────────────────

    async def upsert(
        self,
        table: str,
        data: dict[str, Any] | list[dict[str, Any]],
        on_conflict: str | None = None,
    ) -> dict[str, Any] | list[dict[str, Any]]:
        """Upsert record(s) (insert or update on conflict).

        Args:
            table:       Table name.
            data:        Record or list of records.
            on_conflict: Column(s) to check for conflict, e.g. "email" or "userId,email".

        Returns:
            The upserted record(s).
        """
        headers = self._headers(prefer="return=representation,resolution=merge-duplicates")
        params: dict[str, str] = {}
        if on_conflict:
            params["on_conflict"] = on_conflict

        try:
            response = await self._client.post(
                f"/rest/v1/{table}",
                params=params,
                json=data,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Supabase upsert failed: {exc}")
            raise InternalException(message="Database upsert failed") from exc

        if response.status_code in (200, 201):
            result = response.json()
            return result[0] if isinstance(result, list) and isinstance(data, dict) else result

        log.error(f"Supabase upsert {response.status_code}: {response.text}")
        raise InternalException(message=f"Database upsert error: {response.status_code}")

    # ── Count ───────────────────────────────────────────────────────────────

    async def count(
        self,
        table: str,
        where: dict[str, Any] | None = None,
    ) -> int:
        """Count records in a table.

        Args:
            table: Table name.
            where: Optional filters.

        Returns:
            Total matching record count.
        """
        result = await self.query(
            table,
            select="id",
            where=where,
            count="exact",
            limit=1,
        )
        count_str = result.get("count", "0")
        if count_str == "*":
            return len(result.get("data", []))
        try:
            return int(count_str)
        except (ValueError, TypeError):
            return 0

    # ── Raw SQL (via RPC) ───────────────────────────────────────────────────

    async def raw_sql(self, sql: str) -> Any:
        """Execute raw SQL via Supabase RPC.

        This requires a PostgreSQL function to be pre-created in Supabase.
        The sql parameter is passed as the function name with optional params.

        Args:
            sql: SQL to execute. For simple queries, this should be the name
                 of a PostgreSQL function that exists in Supabase.

        Returns:
            The RPC response data.

        Note:
            Direct raw SQL execution is not supported via PostgREST.
            Use Supabase RPC (Remote Procedure Call) by calling pre-created
            PostgreSQL functions. For ad-hoc SQL, use the Supabase Dashboard
            or the pg module directly.
        """
        headers = self._headers(prefer="return=representation")

        try:
            response = await self._client.post(
                f"/rest/v1/rpc/{sql}",
                json={},
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Supabase RPC failed: {exc}")
            raise InternalException(message="Database RPC failed") from exc

        if response.status_code >= 400:
            log.error(f"Supabase RPC {response.status_code}: {response.text}")
            raise InternalException(message=f"Database RPC error: {response.status_code}")

        return response.json()

    # ── Storage ─────────────────────────────────────────────────────────────

    async def upload_file(
        self,
        bucket: str,
        path: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> dict[str, Any]:
        """Upload a file to Supabase Storage.

        Args:
            bucket:       Storage bucket name.
            path:         File path within the bucket.
            file_bytes:   Raw file content.
            content_type: MIME type of the file.

        Returns:
            Dict with upload metadata.
        """
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": content_type,
        }

        try:
            response = await self._client.post(
                f"/storage/v1/object/{bucket}/{path}",
                content=file_bytes,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Storage upload failed: {exc}")
            raise InternalException(message="File upload failed") from exc

        if response.status_code >= 400:
            log.error(f"Storage upload {response.status_code}: {response.text}")
            raise InternalException(message=f"File upload error: {response.status_code}")

        return {"path": path, "bucket": bucket}

    async def get_public_url(self, bucket: str, path: str) -> str:
        """Get the public URL for a storage file.

        Args:
            bucket: Storage bucket name.
            path:   File path within the bucket.

        Returns:
            Full public URL string.
        """
        return f"{self._base_url}/storage/v1/object/public/{bucket}/{path}"

    async def delete_file(self, bucket: str, path: str) -> None:
        """Delete a file from Supabase Storage.

        Args:
            bucket: Storage bucket name.
            path:   File path within the bucket.
        """
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
        }

        try:
            response = await self._client.delete(
                f"/storage/v1/object/{bucket}/{path}",
                headers=headers,
            )
        except httpx.HTTPError as exc:
            log.error(f"Storage delete failed: {exc}")
            raise InternalException(message="File delete failed") from exc

        if response.status_code >= 400:
            log.error(f"Storage delete {response.status_code}: {response.text}")
            raise InternalException(message=f"File delete error: {response.status_code}")

    # ── Health Check ────────────────────────────────────────────────────────

    async def check_connection(self) -> bool:
        """Check if Supabase is reachable.

        Returns:
            True if connection is healthy, False otherwise.
        """
        try:
            response = await self._client.get(
                "/rest/v1/",
                params={"select": "*"},
                timeout=5.0,
            )
            return response.status_code < 500
        except Exception:
            return False
