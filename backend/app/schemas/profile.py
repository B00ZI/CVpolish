"""Pydantic schemas for the profile endpoints (request + response bodies).

Copy the MasterProfile / AiIntelligence types 1:1 from backend/API.md —
the frontend was built on exactly these shapes, so keep field names identical
(including `bullets" may contain "" placeholders`).
Two AI-endpoint response wrappers live here too:
`{ aiUsed: bool, data: AiIntelligence }`.
"""
