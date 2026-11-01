# QueryScope
Small SQL query engine with an interactive join-order optimizer playground.

## Stack and layout
- TypeScript, Node.js. Tests: `npx vitest run`. SQLite oracle: `better-sqlite3`
- `src/types.ts` types and plan AST
- `src/executor.ts` operators
- `src/optimizer/` join ordering
- `src/cost.ts` cost estimation
- `test/` unit tests, differential tests, oracle helper
- `web/` playground (built last, after the engine is tested)
- `docs/optimizer-findings.md` optimizer failures
No new frameworks, dependencies, or abstractions without explaining why.

## Scope
In: plan AST, Scan, Filter, Project, nested-loop and hash inner joins
(equality predicates only), join ordering across 3-4 tables, operator-level
counters, randomized differential tests vs SQLite, plan comparison UI.
Out: SQL parser, subqueries, aggregates, outer joins, transactions, NULLs,
persistence.

## Data model
- Qualified column names everywhere (e.g. `users.id`)
- Values are integers and strings only
- Operators preserve duplicate rows

## Counters (measured, never estimated)
- `rowsScanned`: base-table rows read by Scan
- `comparisons`: predicate or key-equality evaluations
- `hashBuilds`: rows inserted into a hash table
- `hashProbes`: hash-table lookups
- `rowsProduced`: rows each operator emits, tracked per operator
Identical inputs and plans must give identical counters. Keep measured
counters separate from optimizer cost estimates. Performance claims must
say what was measured and how.

## Correctness
- Compare to SQLite as unordered multisets, preserving duplicates
- Test empty tables, duplicate keys, unmatched keys, different join orders,
  and hash vs nested-loop on identical inputs
- Test counters independently of SQLite
- Randomized tests use reproducible seeds
- Enforce a configurable intermediate-row budget
- Never edit a test just to make an incorrect implementation pass

## Ownership
I write the executor, join algorithms, optimizer, and cost model.
Protected (do not create or modify without explicit permission):
`src/executor.ts`, `src/optimizer/`, `src/cost.ts`
Claude helps with types, tests, oracle, fuzzing, docs, review, and debugging
explanations. When I ask about executor or optimizer logic, explain concepts,
point out bugs and edge cases, and prefer hints or pseudocode over full code.

## When tests fail
Report the failure, what the evidence shows, likely causes (labeled as
hypotheses), and the smallest experiment to isolate it. Do not change
protected files while investigating.

## Reporting
After changes: what changed, which commands were actually run and their
results, what was not tested, remaining risks. Never invent output,
benchmarks, or test results, and never show illustrative numbers as measured.

## Optimizer findings
When the optimizer picks a plan that does more measured work than another
valid plan, add an entry to `docs/optimizer-findings.md`: dataset and query,
chosen plan, better plan, estimated costs, measured counters, suspected cause,
and whether that cause has been verified.