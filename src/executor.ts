import type { Counters, OperatorStats, Plan, Row, Table, Value } from "./types";

export type Database = Record<string, Table>;

// `counters` is the per-operator stats tree, mirroring the plan.
export interface ExecResult {
  rows: Row[];
  counters: OperatorStats;
}

export function zeroCounters(): Counters {
  return { rowsScanned: 0, comparisons: 0, hashBuilds: 0, hashProbes: 0, rowsProduced: 0 };
}

export function scan(plan: Extract<Plan, { type: "Scan" }>, db: Database): ExecResult {
  const table = db[plan.table];
  if (!table) throw new Error(`Unknown table: ${plan.table}`);
  const counters = zeroCounters();
  const rows: Row[] = [];
  for (const row of table.rows) {
    counters.rowsScanned++;
    rows.push(row);
  }
  counters.rowsProduced = rows.length;
  return { rows, counters: { operator: "Scan", counters, children: [] } };
}

export function filter(plan: Extract<Plan, { type: "Filter" }>, db: Database): ExecResult {
  const child = execute(plan.input, db);
  const counters = zeroCounters();
  const rows: Row[] = [];
  for (const row of child.rows) {
    const v = row[plan.column];
    if (v === undefined) throw new Error(`Unknown column: ${plan.column}`);
    counters.comparisons++; // one predicate evaluation per input row
    if (compare(v, plan.op, plan.value)) rows.push(row);
  }
  counters.rowsProduced = rows.length;
  return { rows, counters: { operator: "Filter", counters, children: [child.counters] } };
}

export function project(plan: Extract<Plan, { type: "Project" }>, db: Database): ExecResult {
  const child = execute(plan.input, db);
  const counters = zeroCounters();
  const rows: Row[] = child.rows.map((row) => {
    const out: Row = {};
    for (const col of plan.columns) {
      const v = row[col];
      if (v === undefined) throw new Error(`Unknown column: ${col}`);
      out[col] = v;
    }
    return out;
  });
  counters.rowsProduced = rows.length; // no DISTINCT: duplicates are kept
  return { rows, counters: { operator: "Project", counters, children: [child.counters] } };
}

function compare(a: Value, op: Extract<Plan, { type: "Filter" }>["op"], b: Value): boolean {
  switch (op) {
    case "=": return a === b;
    case "!=": return a !== b;
    case "<": return a < b;
    case "<=": return a <= b;
    case ">": return a > b;
    case ">=": return a >= b;
  }
}

export function execute(plan: Plan, db: Database): ExecResult {
  switch (plan.type) {
    case "Scan":
      return scan(plan, db);
    case "Filter":
      return filter(plan, db);
    case "Project":
      return project(plan, db);
    default:
      throw new Error(`${plan.type} not implemented yet`);
  }
}
