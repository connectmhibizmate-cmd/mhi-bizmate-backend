// MHI BizMate — Response helpers.
// Maps database column names (created_at/updated_at) to the frontend contract
// (created_date/updated_date) so the existing UI needs no changes.

// Transform a single database row to the frontend field naming.
export function transformRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  if (out.created_at) out.created_date = out.created_at;
  if (out.updated_at) out.updated_date = out.updated_at;
  delete out.created_at;
  delete out.updated_at;
  return out;
}

export function transformList(rows) {
  return (rows || []).map(transformRow);
}

// Standard JSON success envelope: { data: ... }
export function sendData(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function sendOk(res, message = "OK") {
  return res.json({ data: { ok: true, message } });
}

export function sendCreated(res, data) {
  return sendData(res, data, 201);
}