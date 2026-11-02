import { describe, expect, it } from "vitest";
import { execute, type Database } from "../src/executor";

const db: Database = {
  users: {
    name: "users",
    columns: ["users.id", "users.name"],
    rows: [
      { "users.id": 1, "users.name": "ann" },
      { "users.id": 2, "users.name": "bob" },
      { "users.id": 2, "users.name": "bob" }, // duplicate row must be preserved
    ],
  },
  empty: { name: "empty", columns: ["empty.x"], rows: [] },
};

describe("Scan", () => {
  it("returns all rows, duplicates included, and counts them", () => {
    const r = execute({ type: "Scan", table: "users" }, db);
    expect(r.rows).toEqual(db.users!.rows);
    expect(r.counters.operator).toBe("Scan");
    expect(r.counters.counters).toEqual({
      rowsScanned: 3, comparisons: 0, hashBuilds: 0, hashProbes: 0, rowsProduced: 3,
    });
    expect(r.counters.children).toEqual([]);
  });

  it("handles an empty table", () => {
    const r = execute({ type: "Scan", table: "empty" }, db);
    expect(r.rows).toEqual([]);
    expect(r.counters.counters.rowsScanned).toBe(0);
    expect(r.counters.counters.rowsProduced).toBe(0);
  });

  it("throws on an unknown table", () => {
    expect(() => execute({ type: "Scan", table: "nope" }, db)).toThrow(/Unknown table/);
  });

  it("gives identical counters on repeated runs", () => {
    const plan = { type: "Scan", table: "users" } as const;
    expect(execute(plan, db).counters).toEqual(execute(plan, db).counters);
  });
});

describe("Filter", () => {
  const scanUsers = { type: "Scan", table: "users" } as const;

  it("keeps matching rows, preserves duplicates, counts one comparison per input row", () => {
    const r = execute({ type: "Filter", input: scanUsers, column: "users.id", op: "=", value: 2 }, db);
    expect(r.rows).toEqual([db.users!.rows[1], db.users!.rows[2]]);
    expect(r.counters.operator).toBe("Filter");
    expect(r.counters.counters).toEqual({
      rowsScanned: 0, comparisons: 3, hashBuilds: 0, hashProbes: 0, rowsProduced: 2,
    });
    // child Scan counters are tracked separately
    expect(r.counters.children[0]!.counters.rowsScanned).toBe(3);
    expect(r.counters.children[0]!.counters.rowsProduced).toBe(3);
  });

  it("returns nothing when no row matches", () => {
    const r = execute({ type: "Filter", input: scanUsers, column: "users.id", op: "=", value: 99 }, db);
    expect(r.rows).toEqual([]);
    expect(r.counters.counters.comparisons).toBe(3);
    expect(r.counters.counters.rowsProduced).toBe(0);
  });

  it("does no comparisons on empty input", () => {
    const r = execute(
      { type: "Filter", input: { type: "Scan", table: "empty" }, column: "empty.x", op: "=", value: 1 }, db);
    expect(r.rows).toEqual([]);
    expect(r.counters.counters.comparisons).toBe(0);
  });

  it("supports string equality and range operators", () => {
    const eq = execute({ type: "Filter", input: scanUsers, column: "users.name", op: "=", value: "ann" }, db);
    expect(eq.rows).toHaveLength(1);
    const gt = execute({ type: "Filter", input: scanUsers, column: "users.id", op: ">", value: 1 }, db);
    expect(gt.rows).toHaveLength(2);
    const ne = execute({ type: "Filter", input: scanUsers, column: "users.id", op: "!=", value: 1 }, db);
    expect(ne.rows).toHaveLength(2);
  });

  it("throws on an unknown column", () => {
    expect(() =>
      execute({ type: "Filter", input: scanUsers, column: "users.zzz", op: "=", value: 1 }, db),
    ).toThrow(/Unknown column/);
  });
});
