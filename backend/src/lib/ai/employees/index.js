// MHI BizMate — AI Gateway: AI Employee registry.
//
// Central registry of all four AI Employees. The Gateway and route layer
// use this to look up employees by ID. AI Employees are defined once here
// and referenced by ID everywhere else — their provider/model can be
// swapped at runtime without changing the registry.

import { AiEmployee } from "./base.js";
import { facebookCommentAI } from "./facebookComment.js";
import { messengerAI } from "./messenger.js";
import { businessIntelAI } from "./businessIntel.js";
import { adminPanelAI } from "./adminPanel.js";
import { supportAI } from "./support.js";

const _employees = [facebookCommentAI, messengerAI, businessIntelAI, adminPanelAI, supportAI];
const _byId = new Map(_employees.map((e) => [e.id, e]));

export function listEmployees() {
  return _employees;
}

export function getEmployee(id) {
  return _byId.get(id) || null;
}

export function getEmployeesByAudience(audience) {
  return _employees.filter((e) => e.audience === audience);
}