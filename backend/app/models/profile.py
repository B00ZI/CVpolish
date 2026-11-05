"""SQLAlchemy table: the MasterProfile of one language, stored as JSONB.

Shape comes from backend/API.md section 4 (MasterProfile). Columns are just
`lang` (primary key, "en" | "fr"), `data` (the whole profile JSON), and
`updated_at`. Keep future Job handling OUT of this file — jobs get their own
model file when you reach step 2.
"""
