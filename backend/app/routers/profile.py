"""Profile endpoints — the whole Page 1 of backend/API.md:

    GET    /api/profile/{lang}                    -> empty structure first time
    PUT    /api/profile/{lang}                    -> full replace (autosave)
    DELETE /api/profile/{lang}                    -> back to empty structure
    POST   /api/profile/{lang}/extract-intelligence  (AI, always 200 +
    `aiUsed` fallback)

Business logic goes in the endpoint bodies or small helper functions in this
file; this router is where jobs routers will be added as siblings later
(app/routers/jobs.py).
"""
