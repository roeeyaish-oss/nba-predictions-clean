// Safe localStorage helpers — Safari PWA / private mode can throw SecurityError
// on property access, not just on set/get calls.

export function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function lsGetJson(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
