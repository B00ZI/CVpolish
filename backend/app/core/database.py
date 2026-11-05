"""Database access for the whole app.

Create the SQLAlchemy engine and SessionLocal from DATABASE_URL (config.py),
and provide a `get_db` dependency for routers. One super-lightweight table
for now (per backend/API.md):

    profiles (lang PK, data JSONB, updated_at)
"""
