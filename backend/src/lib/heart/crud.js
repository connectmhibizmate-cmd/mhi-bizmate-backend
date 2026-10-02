// MHI BizMate — Heart of BizMate: Generic CRUD handler factory.
// Creates workspace-scoped CRUD handlers for simple entities. Every handler
// enforces: workspace isolation, permission check, validation, audit log.
import { supabase } from "../supabaseClient.js";
import { hasPermission } from "./permissions.js";
import { ForbiddenError, NotFoundError, ValidationError, HeartError } from "../errors.js";
import { auditLog } from "../audit.js";

// Parse sort string like "-created_date" → { column: "created_at", ascending: false }
function parseSort(sort) {
  if (!sort) return null;
  const desc = sort.startsWith("-");
  const col = desc ? sort.slice(1) : sort;
  // Map frontend field names to database columns
  const colMap = { created_date: "created_at", updated_date: "updated_at", order_date: "order_date" };
  return { column: colMap[col] || col, ascending: !desc };
}

export function makeCrudHandler({ table, action, entityName, permissionAction, validate }) {
  return {
    async list(ctx, { sort, limit, filter } = {}) {
      let query = supabase.from(table).select("*").eq("workspace_id", ctx.workspaceId);
      if (filter && typeof filter === "object") {
        for (const [k, v] of Object.entries(filter)) {
          if (v !== undefined && v !== null && v !== "") {
            const dbCol = k === "created_date" ? "created_at" : k === "updated_date" ? "updated_at" : k;
            query = query.eq(dbCol, v);
          }
        }
      }
      const s = parseSort(sort);
      if (s) query = query.order(s.column, { ascending: s.ascending });
      if (limit) query = query.limit(parseInt(limit, 10));
      const { data, error } = await query;
      if (error) throw new HeartError(`Failed to list ${entityName}: ${error.message}`);
      return data;
    },

    async get(ctx, id) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .eq("workspace_id", ctx.workspaceId)
        .maybeSingle();
      if (error) throw new HeartError(`Failed to get ${entityName}: ${error.message}`);
      if (!data) throw new NotFoundError(entityName);
      return data;
    },

    async create(ctx, body) {
      if (!hasPermission(ctx.role, permissionAction)) {
        throw new ForbiddenError(`Your role (${ctx.role}) cannot create ${entityName}.`);
      }
      if (validate?.create) {
        const ve = validate.create(body);
        if (ve) throw new ValidationError(ve);
      }
      const row = { ...body, workspace_id: ctx.workspaceId };
      const { data, error } = await supabase.from(table).insert(row).select("*").single();
      if (error) {
        if (error.code === "23505") throw new HeartError(`A ${entityName} with these details already exists.`);
        throw new HeartError(`Failed to create ${entityName}: ${error.message}`);
      }
      await auditLog(ctx, `${entityName}.created`, entityName, data.id, { name: data.name || data.title || data.id });
      return data;
    },

    async update(ctx, id, body) {
      if (!hasPermission(ctx.role, permissionAction)) {
        throw new ForbiddenError(`Your role (${ctx.role}) cannot update ${entityName}.`);
      }
      // Remove fields that must not be client-set
      const { id: _id, workspace_id: _ws, created_at: _ca, ...updatable } = body;
      const { data, error } = await supabase
        .from(table)
        .update(updatable)
        .eq("id", id)
        .eq("workspace_id", ctx.workspaceId)
        .select("*")
        .maybeSingle();
      if (error) throw new HeartError(`Failed to update ${entityName}: ${error.message}`);
      if (!data) throw new NotFoundError(entityName);
      await auditLog(ctx, `${entityName}.updated`, entityName, id, { fields: Object.keys(updatable) });
      return data;
    },

    async remove(ctx, id) {
      if (!hasPermission(ctx.role, permissionAction)) {
        throw new ForbiddenError(`Your role (${ctx.role}) cannot delete ${entityName}.`);
      }
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("workspace_id", ctx.workspaceId);
      if (error) throw new HeartError(`Failed to delete ${entityName}: ${error.message}`);
      await auditLog(ctx, `${entityName}.deleted`, entityName, id, {});
      return true;
    },

    async removeMany(ctx, filter) {
      if (!hasPermission(ctx.role, permissionAction)) {
        throw new ForbiddenError(`Your role (${ctx.role}) cannot delete ${entityName}.`);
      }
      let query = supabase.from(table).delete().eq("workspace_id", ctx.workspaceId);
      if (filter && typeof filter === "object") {
        for (const [k, v] of Object.entries(filter)) {
          if (v !== undefined && v !== null && v !== "") {
            const dbCol = k === "created_date" ? "created_at" : k;
            query = query.eq(dbCol, v);
          }
        }
      }
      const { error } = await query;
      if (error) throw new HeartError(`Failed to delete ${entityName}: ${error.message}`);
      await auditLog(ctx, `${entityName}.bulk_deleted`, entityName, null, { filter });
      return true;
    },
  };
}