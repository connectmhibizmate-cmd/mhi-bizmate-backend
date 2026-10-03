// MHI BizMate — AI Gateway: Structured action validation.
//
// Validates AI-generated structured output against the action schemas before
// it reaches the Heart of BizMate. This is the FIRST validation gate:
//   AI Output → [Schema Validation] → Permission → Workspace → Business
//   Rules → Required Fields → Duplicate → Heart → Execution
//
// Schema validation catches malformed AI output early. The Heart's existing
// execute() function handles permission, workspace, and business-rule
// validation — this module does NOT duplicate that.

import { ACTION_SCHEMAS } from "./schemas.js";
import { AiSchemaValidationError, AiMalformedOutputError } from "../errors.js";
import { AI_ALLOWED_ACTIONS } from "../../heart/actions.js";

// Validate that AI output is a valid structured action proposal.
// Returns the validated { action, data } or throws.
export function validateActionProposal(output) {
  if (!output || typeof output !== "object") {
    throw new AiMalformedOutputError("ai", "AI output is not an object");
  }
  const action = output.action;
  if (!action) {
    throw new AiMalformedOutputError("ai", "AI output missing 'action' field");
  }

  // Check the action is in the allowed set for AI
  if (!AI_ALLOWED_ACTIONS.has(action)) {
    throw new AiSchemaValidationError(action, [`Action "${action}" is not permitted for AI employees`]);
  }

  const schema = ACTION_SCHEMAS[action];
  if (!schema) {
    throw new AiSchemaValidationError(action, [`No schema registered for action "${action}"`]);
  }

  const errors = _validateAgainstSchema(output, schema);
  if (errors.length > 0) {
    throw new AiSchemaValidationError(action, errors);
  }

  return { action, data: output.data };
}

// Lightweight JSON-schema validator (subset). Handles type, required,
// minLength, maxLength, minimum, maximum, enum, const, format:uuid,
// additionalProperties, arrays, and nested objects.
// This avoids adding a full JSON-schema library dependency.
function _validateAgainstSchema(value, schema, path = "") {
  const errors = [];

  if (schema.type && !_checkType(value, schema.type)) {
    errors.push(`${path || "root"}: expected ${schema.type}, got ${typeof value}`);
    return errors;
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${path || "root"}: expected const "${schema.const}", got "${value}"`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path || "root"}: value "${value}" not in enum [${schema.enum.join(", ")}]`);
  }

  if (schema.type === "object") {
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in (value || {}))) {
          errors.push(`${path || "object"}: missing required field "${field}"`);
        }
      }
    }
    if (schema.properties) {
      for (const [key, val] of Object.entries(value || {})) {
        if (schema.properties[key]) {
          errors.push(..._validateAgainstSchema(val, schema.properties[key], `${path ? path + "." : ""}${key}`));
        } else if (schema.additionalProperties === false) {
          errors.push(`${path || "object"}: additional property "${key}" not allowed`);
        }
      }
    }
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) return errors;
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(`${path || "array"}: expected at least ${schema.minItems} items, got ${value.length}`);
    }
    if (schema.items) {
      value.forEach((item, i) => {
        errors.push(..._validateAgainstSchema(item, schema.items, `${path || "array"}[${i}]`));
      });
    }
  }

  if (schema.type === "string") {
    if (typeof value === "string") {
      if (schema.minLength && value.length < schema.minLength) {
        errors.push(`${path || "string"}: length ${value.length} < minLength ${schema.minLength}`);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`${path || "string"}: length ${value.length} > maxLength ${schema.maxLength}`);
      }
      if (schema.format === "uuid" && !_isUuid(value)) {
        errors.push(`${path || "string"}: "${value}" is not a valid UUID`);
      }
    }
  }

  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value === "number") {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path || "number"}: ${value} < minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path || "number"}: ${value} > maximum ${schema.maximum}`);
      }
      if (schema.type === "integer" && !Number.isInteger(value)) {
        errors.push(`${path || "number"}: ${value} is not an integer`);
      }
    }
  }

  return errors;
}

function _checkType(value, type) {
  switch (type) {
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array": return Array.isArray(value);
    case "string": return typeof value === "string";
    case "number": return typeof value === "number";
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    default: return true;
  }
}

function _isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}