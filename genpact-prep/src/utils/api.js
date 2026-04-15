export const API_BASE = process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api";
export const PAGE_SIZE = 8;

export async function apiFetch(url, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorMsg = `API error: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.error) errorMsg = errData.error;
    } catch (e) {
      // Ignored, fallback to generic 
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function callAI(messages, endpoint = "generate", extra = {}) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...extra }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.content || data.debrief || data;
}
