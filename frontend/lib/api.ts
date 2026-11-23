// One thin fetch helper for the whole app — no other file calls fetch().
// Base URL comes from NEXT_PUBLIC_API_URL (inlined at build/dev start);
// the default covers docker-compose's frontend container.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** JSON request against the backend. Non-2xx throws ApiError with the
 *  FastAPI `detail` message when present (422/404 etc). */
export async function api<T>(
  path: string,
  init?: { method?: string; json?: unknown; timeoutMs?: number },
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: { "content-type": "application/json" },
      body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      let detail: unknown = res.statusText;
      try {
        const body = (await res.json()) as { detail?: unknown };
        if (body.detail !== undefined) detail = body.detail;
      } catch {
        // non-JSON error body -> keep statusText
      }
      throw new ApiError(
        typeof detail === "string" ? detail : JSON.stringify(detail),
        res.status,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** AbortController timeouts throw a DOMException, not an Error — check the
 *  name instead of `instanceof Error` so the message is accurate. */
export function isAbortError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: unknown }).name === "AbortError"
  );
}

/** Short human message for any thrown value (toasts). */
export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (isAbortError(e)) return "The backend took too long to answer.";
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
