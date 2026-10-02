// Order number generator — unique per call, chronologically sortable.
// Format: ORD-<unix milliseconds>. Used by the orders service when creating
// an order in Supabase (the app no longer relies on a backend function for it).
export function generateOrderNumber() {
  return `ORD-${Date.now()}`;
}

export default generateOrderNumber;