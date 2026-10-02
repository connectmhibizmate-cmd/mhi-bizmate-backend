// MHI BizMate — OFFLINE PREVIEW STUB (Backend Reset)
//
// After the complete backend reset, NO database, backend, AI, Meta, or auth
// provider is connected. The frontend is UI-LOCKED and must still render so it
// can be reviewed while the new production backend ("Heart of BizMate") is built.
//
// These helpers are a CLEARLY-ISOLATED PLACEHOLDER, not production functionality.
// Every method resolves with empty data so the existing UI shows its own empty
// states. Nothing here pretends to be a real backend. When the new backend is
// ready, replace the service modules in this directory with real adapters —
// the UI stays untouched.

const emptyList = () => Promise.resolve([]);
const emptyGet = () => Promise.resolve(null);
const noop = () => Promise.resolve();

// Minimal CRUD stub matching the old makeCrud interface so any service that
// delegates to it keeps working without a database.
export function emptyCrud() {
  return {
    list: emptyList,
    filter: emptyList,
    get: emptyGet,
    create: emptyGet,
    update: emptyGet,
    remove: noop,
    removeMany: noop,
    bulkUpdate: (records) => Promise.resolve(records || []),
  };
}

export { emptyList, emptyGet, noop };