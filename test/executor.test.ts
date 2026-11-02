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
