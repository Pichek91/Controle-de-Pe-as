// src/badgeBus.ts
type Handler = () => void;
const listeners = new Set<Handler>();

export function onBadgeRefresh(handler: Handler): () => void {
  listeners.add(handler);
  return () => { listeners.delete(handler); };
}

export function emitBadgeRefresh() {
  listeners.forEach((fn) => { try { fn(); } catch {} });
}
