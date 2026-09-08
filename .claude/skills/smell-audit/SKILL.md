---
name: smell-audit
description: Runs a deep code-smell audit of a codebase (or a given subset of it) — identify smells via the growing-oos and refactoring skills, then explain each one against SOLID/Freeman & Pryce/Fowler and propose a fix order — writing the result to a report file. Use when asked to review, re-review, or audit a codebase for code smells, or to regenerate a previous smell-audit report.
---

# Codebase Smell Audit

This skill runs a full, standing-codebase smell audit: read the relevant source and test files,
run the `growing-oos` and `refactoring` skills over them, synthesise and verify the findings,
then explain each smell and propose a fix order. It works on any project — it does not hard-code
file paths, and determines its own scope and output location each time it runs (see below).

This is deliberately distinct from the global `code-review` skill, which reviews the current
_diff_ for correctness bugs and cleanups. This skill is unrelated to that: it's a standing
review of the whole (or a chosen part of the) codebase as it exists right now, not a diff review.
Keep the two skills' names distinct — a name collision causes the wrong one to be invoked.

See `example-output.md` in this skill's directory for a calibration example of the expected
structure, depth, and tone of the final report (it is a generic illustration, not a real audit —
don't treat its content as findings about any real codebase).

## When to use this

- The user asks to "review the codebase," "find code smells," "audit `<some path>`," or
  "regenerate the smell audit."
- After a round of refactoring, to check whether old smells were fully fixed and whether the fix
  introduced new ones — a prior finding can be corroborated or refuted against the current code
  rather than re-derived from scratch (see step 3 and step 9 below).

## Procedure

Do not skip steps or shortcut straight to writing prose — each step below feeds the next.

1. **Determine scope.** If the user named specific paths, use those. Otherwise, look for the
   project's own conventions first: a README, contributing guide, or existing lint/test config
   that names its source and test directories. Failing that, infer from common layout
   conventions (e.g. `src/`/`lib/`/`app/` for source, `test/`/`tests/`/`spec/`/`__tests__/` for
   tests), always excluding dependency and build directories (`node_modules`, `vendor`, `dist`,
   `build`, `.git`, etc). If the repo is large enough that "read every file" would be
   impractical, or the scope is genuinely ambiguous, ask the user to confirm or narrow it before
   reading everything — don't silently sample a large codebase and report as if it were
   exhaustive.

2. **Read every file in scope.** Do not sample — read all of them. Distinguish production code
   from test code as you go (their smells and justifications differ), using whatever grouping
   the project itself uses (e.g. a `tests/`-style directory, or a `*.test.*`/`*.spec.*` naming
   convention) rather than assuming a specific structure.

3. **Check for a previous audit to compare against.** Look for a prior report from this skill —
   most likely at the default output path from step 9, but also check recent git history in case
   a previous report existed and was since deleted or moved. If one is found, read it so the new
   review can note which previously-identified smells have since been fixed (and whether the fix
   introduced anything new) — a fixed smell that masked a real bug (e.g. a stale reference
   silently passing a vacuous test) is worth calling out explicitly as a verified fix, not just
   dropped silently from the list.

4. **Invoke the `growing-oos` skill** (via the Skill tool), passing it the list of files in scope
   and asking it to identify smells with a focus on: test-driven design feedback, mock/test-double
   quality, and the OO design heuristics in Freeman & Pryce (Tell Don't Ask, Context
   Independence, No String Types, Single Responsibility as seen through hard-to-test code).

5. **Invoke the `refactoring` skill** (via the Skill tool), passing it the same file list and
   asking it to corroborate the smells found in step 4 using Fowler's smell catalogue, and to
   surface any additional smells the first pass missed (duplicated code, data clumps, feature
   envy, primitive obsession, long parameter lists, inheritance misuse, misplaced module
   boundaries, etc).

6. **Synthesise one list of smells** from steps 4–5, deduplicating where both passes found the
   same issue from different angles (note both angles when that happens — it strengthens the
   case for the smell rather than being redundant).

7. **Verify smells are real, don't just theorise.** Where a smell claim can be checked
   mechanically (e.g. "this symbol no longer exists," "this test only asserts final state,"
   "this module is never imported outside its test"), check it — run the project's test suite,
   grep for the symbol, or trace the call site. A smell backed by a demonstrated live bug or a
   passing-but-vacuous test is worth reporting more prominently than a purely stylistic one.

8. For **each** identified smell, write a section covering, in this order:
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
      end (step 9), not repeated per smell.

9. **Propose a single fix order for all smells together**, optimising for _least total work_:
   - Do trivial, dependency-free fixes (unused parameters, renames) first — they're free and
     get out of the way of later diffs.
   - Do the smells with the widest fan-out (the ones other smells' fixes would otherwise
     duplicate — e.g. extracting a shared abstraction, or encapsulating a collection that's
     manipulated raw in multiple places) before anything that depends on or overlaps with them.
   - Sequence any smells that touch the same class/file next to each other, so that file is
     only reopened once.
   - Explicitly justify _why_ this order minimises rework — don't just list an order, explain
     which later steps are cheaper or unnecessary because of an earlier one.

10. **Write the result to a report file.** Default to `./smell_audit.md` at the project root
    unless the user names a different path/filename, overwriting any previous version at that
    path. Structure the document as:
    - A short intro naming what was reviewed (the scope from step 1) and which skills/method
      were used, and noting whether a previous audit was found and compared against (step 3).
    - A "Background: the principles referenced" section defining Fowler, Freeman & Pryce, and
      SOLID briefly, since later sections assume the reader has just read this.
    - One `###` section per smell, per step 8.
    - A final "Suggested order of work" section, per step 9.

## Notes

- This is a **read and report** skill — it does not modify the source or test code itself.
  Applying the refactorings is separate work the user can ask for afterward.
- Keep the tone and rigor consistent with `example-output.md` in this skill's directory — that
  file is the reference for expected output quality and depth, kept generic on purpose so it
  stays valid across different projects. If a project accumulates its own prior audit reports
  over time, those become an additional (project-specific) calibration reference per step 3, but
  `example-output.md` should not itself be edited to describe any one project's findings.
