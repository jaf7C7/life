---
name: smell-audit
description: Runs this project's own deep code-smell audit — identify smells via the growing-oos and refactoring skills, then explain each one against SOLID/Freeman & Pryce/Fowler and propose a fix order — writing the result to ./smell_audit.md. Use when asked to review, re-review, or audit this codebase for code smells, or to regenerate smell_audit.md.
---

# Project Smell Audit (`life`)

This skill reproduces, on demand, the review process used to produce
`refactoring_notes.md` and `refactoring_notes_2.md`. It is scoped to this project because it
hard-codes where to look (`life/`, `tests/`) and where to write the result (`./smell_audit.md`).

This is deliberately named differently from the global `code-review` skill (which reviews the
current _diff_ for correctness bugs and cleanups). This one is unrelated to that: it's a full,
standing-codebase smell audit, not a diff review. It was previously named `code-review`, which
collided with the global skill's name and caused the global one to run instead of this one —
keep the name distinct to avoid that happening again.

## When to use this

- The user asks to "review the codebase," "find code smells," "audit `life`/`tests`," or
  "regenerate `smell_audit.md`."
- After a round of refactoring, to check whether old smells were fully fixed and whether the
  fix introduced new ones (this is exactly how the `Cell.step` regression in
  `tests/unit/helpers.js` was caught previously — a refactor to `life/cell.js` left a stale
  reference behind in a test helper, silently masked by a vacuous assertion).

## Procedure

Do not skip steps or shortcut straight to writing prose — each step below feeds the next.

1. **Read every file** in `life/` and `tests/` (recursively — include `tests/unit/` and
   `tests/e2e/`, both source and helpers). Do not sample; read all of them. Treat `life/` as
   production code and `tests/` as test code — smells and their justifications differ between
   the two.

2. **Invoke the `growing-oos` skill** (via the Skill tool), passing it the list of files and
   asking it to identify smells with a focus on: test-driven design feedback, mock/test-double
   quality, and the OO design heuristics in Freeman & Pryce (Tell Don't Ask, Context
   Independence, No String Types, Single Responsibility as seen through hard-to-test code).

3. **Invoke the `refactoring` skill** (via the Skill tool), passing it the same file list and
   asking it to corroborate the smells found in step 2 using Fowler's smell catalogue, and to
   surface any additional smells the first pass missed (duplicated code, data clumps, feature
   envy, primitive obsession, long parameter lists, inheritance misuse, etc).

4. **Synthesise one list of smells** from steps 2–3, deduplicating where both passes found the
   same issue from different angles (note both angles when that happens — it strengthens the
   case for the smell rather than being redundant).

5. **Verify smells are real, don't just theorise.** Where a smell claim can be checked
   mechanically (e.g. "this constant no longer exists," "this test only asserts final state"),
   check it — run the test suite (`npm test`), grep for the symbol, or trace the call site.
   A smell backed by a demonstrated live bug or a passing-but-vacuous test is worth reporting
   more prominently than a purely stylistic one.

6. For **each** identified smell, write a section covering, in this order:
   1. **Why it's bad** — explained in enough depth for a reader with little to no prior
      knowledge of the referenced work. Ground the explanation in whichever of these actually
      apply (don't force a reference that doesn't fit):
      - the relevant **SOLID** principle(s), named and briefly defined before being applied;
      - **Freeman & Pryce** (_Growing Object-Oriented Software, Guided by Tests_, 2012) —
        e.g. tests-as-design-feedback, mock/stub discipline, "No String Types," Context
        Independence;
      - **Fowler** (_Refactoring_, 2nd ed., 2018) — the named smell from his catalogue.
   2. **The refactoring** — name Fowler's specific refactoring(s) that fix it (e.g. Extract
      Class, Move Function, Parameterize Function, Split Phase, Replace Constructor with
      Factory Function) and describe the mechanical steps in enough detail that someone could
      follow them without re-deriving the approach themselves.
   3. Nothing else in this per-smell section — ordering across smells is handled once, at the
      end (step 7), not repeated per smell.

7. **Propose a single fix order for all smells together**, optimising for _least total work_:
   - Do trivial, dependency-free fixes (unused parameters, renames) first — they're free and
     get out of the way of later diffs.
   - Do the smells with the widest fan-out (the ones other smells' fixes would otherwise
     duplicate — e.g. extracting a shared coordinate/viewport abstraction, or encapsulating a
     collection that's manipulated raw in multiple places) before anything that depends on or
     overlaps with them.
   - Sequence any smells that touch the same class/file next to each other, so that file is
     only reopened once.
   - Explicitly justify _why_ this order minimises rework — don't just list an order, explain
     which later steps are cheaper or unnecessary because of an earlier one.

8. **Write the result to `./smell_audit.md`** (project root), overwriting any previous
   version. Structure the document as:
   - A short intro naming what was reviewed and which skills/method were used.
   - A "Background: the principles referenced" section defining Fowler, Freeman & Pryce, and
     SOLID briefly, since later sections assume the reader has just read this.
   - One `###` section per smell, per step 6.
   - A final "Suggested order of work" section, per step 7.

## Notes

- This is a **read and report** skill — it does not modify `life/` or `tests/` source itself.
  Applying the refactorings is separate work the user can ask for afterward.
- If `smell_audit.md` already exists from a previous run, read it first so the new review can
  note which previously-identified smells have since been fixed (and whether the fix introduced
  anything new), the way `refactoring_notes_2.md` did against `refactoring_notes.md`.
- Keep the tone and rigor consistent with `refactoring_notes.md` / `refactoring_notes_2.md` in
  this repo — those are the reference examples of the expected output quality and depth.
