export function getOrCreateVisitorId() {
  const key = 'visitorId';
  let id = null;
  try {
    id = localStorage.getItem(key);
    if (!id) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      }
      localStorage.setItem(key, id);
    }
  } catch (e) {
    // localStorage may be unavailable; fallback to a volatile id
    if (!id) id = 'anon-' + Date.now().toString(36);
  }
  return id;
}
