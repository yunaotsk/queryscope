import type { Counters, OperatorStats, Plan, Row, Table } from "./types";

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

export function execute(plan: Plan, db: Database): ExecResult {
  switch (plan.type) {
    case "Scan":
      return scan(plan, db);
    default:
      throw new Error(`${plan.type} not implemented yet`);
  }
}
