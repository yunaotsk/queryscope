// Values are integers and strings only (no NULLs).
export type Value = number | string;

// Keys are qualified column names, e.g. "users.id".
export type Row = Record<string, Value>;

export interface Table {
  name: string;
  columns: string[]; // qualified, e.g. ["users.id", "users.name"]
  rows: Row[];
}

// A column reference is a qualified name, e.g. "users.id".
export type ColumnRef = string;

export interface Scan {
  type: "Scan";
  table: string;
}

export interface Filter {
  type: "Filter";
  input: Plan;
  column: ColumnRef;
  op: "=" | "!=" | "<" | "<=" | ">" | ">=";
  value: Value;
}

export interface Project {
  type: "Project";
  input: Plan;
  columns: ColumnRef[];
}

// Inner equi-joins: left.leftKey = right.rightKey.
// HashJoin builds on `left` and probes with `right`.
export interface HashJoin {
  type: "HashJoin";
  left: Plan;
  right: Plan;
  leftKey: ColumnRef;
  rightKey: ColumnRef;
}

// NestedLoopJoin uses `left` as the outer input and `right` as the inner input.
export interface NestedLoopJoin {
  type: "NestedLoopJoin";
  left: Plan;
  right: Plan;
  leftKey: ColumnRef;
  rightKey: ColumnRef;
}

export type Plan = Scan | Filter | Project | HashJoin | NestedLoopJoin;

// Measured counters for a single operator. A counter that does not apply to
// an operator stays 0 (e.g. rowsScanned is only nonzero for Scan).
export interface Counters {
  rowsScanned: number; // base-table rows read by Scan
  comparisons: number; // predicate or key-equality evaluations
  hashBuilds: number; // rows inserted into a hash table
  hashProbes: number; // hash-table lookups
  rowsProduced: number; // rows this operator emitted
}

// Per-operator counters, mirroring the plan's tree shape.
export interface OperatorStats {
  operator: Plan["type"];
  counters: Counters;
  children: OperatorStats[];
}
