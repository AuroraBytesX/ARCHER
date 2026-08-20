import json
from sqlalchemy import TypeDecorator, String
from pgvector.sqlalchemy import Vector
from app.core.config import settings

class SafeVector(TypeDecorator):
    """
    Uses PostgreSQL pgvector.Vector when on Postgres,
    and string/JSON serialized array when on SQLite fallback.
    """
    impl = String
    cache_ok = True

    def __init__(self, dim=384, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(self.dim))
        else:
            return dialect.type_descriptor(String(65535))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        if isinstance(value, (list, tuple)):
            return json.dumps(list(value))
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            # pgvector returns numpy array or list
            if hasattr(value, "tolist"):
                return value.tolist()
            return list(value)
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return []
        return value
