import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any

# ── Sensitive headers to filter from logs ──────────────────────────────────────

SENSITIVE_HEADERS: set[str] = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-supabase-service-role-key",
    "x-supabase-anon-key",
}


class JSONFormatter(logging.Formatter):
    """Structured JSON log formatter.

    Outputs one JSON object per line containing:
      - timestamp  (ISO-8601 UTC)
      - level      (INFO, WARNING, ERROR, …)
      - message
      - module
      - request_id (if present in the LogRecord)
      - extra fields passed via logger.info("msg", extra={…})
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }

        # Attach request_id if present (injected by RequestIDMiddleware)
        request_id = getattr(record, "request_id", None)
        if request_id:
            log_entry["request_id"] = request_id

        # Attach any extra fields
        if hasattr(record, "extra_fields") and record.extra_fields:
            log_entry.update(record.extra_fields)

        # Exception info
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


class SensitiveHeaderFilter(logging.Filter):
    """Filter that redacts sensitive header values in log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = _redact_headers(str(record.msg))
        if isinstance(record.args, tuple):
            record.args = tuple(_redact_headers(str(a)) for a in record.args)
        return True


def _redact_headers(text: str) -> str:
    """Replace sensitive header values with [REDACTED] in a log string."""
    for header in SENSITIVE_HEADERS:
        # Match patterns like "Authorization: Bearer ey..." or "authorization=Bearer..."
        import re

        pattern = rf'({header})[:\s=][^\s,\]"\n]+'
        replacement = rf'\1: [REDACTED]'
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger with JSON formatting.

    Call once at application startup. All subsequent ``get_logger()`` calls
    will inherit this configuration.
    """
    root = logging.getLogger()
    root.setLevel(level)

    # Avoid duplicate handlers on reload
    if root.handlers:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    handler.addFilter(SensitiveHeaderFilter())
    root.addHandler(handler)

    # Quiet noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger with structured JSON output.

    The logger inherits the root handler configured by ``setup_logging()``.

    Usage::

        log = get_logger(__name__)
        log.info("request processed", extra={"extra_fields": {"path": "/api/v1/complaints"}})
    """
    return logging.getLogger(name)
