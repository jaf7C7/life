**The prompts**:

> /growing-oos

_[...]_

> identify any code smells in this repository, look in particular at _all_ files under life/ and tests/
> directories.

_[...]_

> /refactoring

_[...]_

> restate the discovered smells, and for each smell: 1. explain in detail _why_
> each smell is a bad thing, referencing the SOLID principles, the work of
> Freeman & Pryce, as well as the work of Fowler, assuming little to no prior
> knowledge of the principles they discuss, 2. describe the refactoring which
> can be used to fix the smell. finally suggest an order in which to tackle
> each smell, so as to reduce the total amount of work needed to fix them all.
> formulate your answer as a markdown document and write it to the file
> ./refactoring_notes.md

---

# Refactoring Notes

This document catalogues the code smells identified in this codebase, explains why each is
harmful, and describes the refactoring needed to fix it. A suggested order for tackling them
is given at the end.

---

## Background: the principles referenced

Three bodies of work are referenced throughout:

- **Fowler** — Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed.,
  2018). Catalogues "code smells" (patterns that signal design problems) and named
  refactorings (mechanical steps that fix them without changing behaviour).

- **Freeman & Pryce** — Steve Freeman & Nat Pryce, _Growing Object-Oriented Software, Guided
  by Tests_ (2012). Argues that tests are a design tool: if code is hard to test, the design
  has a problem. Listening to that difficulty leads to better object boundaries.

- **SOLID** — five object-oriented design principles (Robert Martin). Briefly:
  - **S** — _Single Responsibility_: a class should have only one reason to change.
  - **O** — _Open/Closed_: open for extension, closed for modification.
  - **L** — _Liskov Substitution_: a subclass must be safely usable wherever its parent is.
  - **I** — _Interface Segregation_: don't force a class to depend on things it doesn't use.
  - **D** — _Dependency Inversion_: high-level logic should depend on abstractions, not on
    low-level concrete details.

---

## Smell 1: `Cell` mixes domain identity with display constants (`life/cell.js`)

### What the smell is

`Cell` holds `x` and `y` coordinates — its _identity_ — alongside `size`, `borderWidth`,
`aliveColor`, `deadColor`, `borderColor`, and `step` — its _rendering appearance_. These are
two entirely different concerns living in the same class.

### Why it is a problem

**Fowler — Divergent Change.** A class has a Divergent Change smell when it would need to be
edited for more than one independent reason. If the designer changes the colour scheme, `Cell`
must change. If the coordinate representation changes, `Cell` must also change. These are
unrelated reasons; they should not share a home.

**SOLID — Single Responsibility (S).** The Single Responsibility Principle says a class
should have one reason to change. "Reason to change" is not about how many methods a class
has, but about _who_ drives changes to it. The rendering team drives colour and pixel-size
decisions; the domain logic drives coordinate decisions. Two drivers, one class — a violation.

**Freeman & Pryce — Context Independence.** An object should not know about the system it
lives in. A `Cell` in Conway's Game of Life is a pure coordinate: it has no inherent colour
or pixel size. By embedding display constants on `Cell`, we are making the domain object aware
of the rendering context, breaking its independence. This matters practically: you cannot use
`Cell` (or anything that imports it) in a non-rendering context without dragging all the
display constants along as passengers.

This smell is also the root cause of **Smells 2 and 6** below.

### The refactoring

**Extract Class** (Fowler, Ch. 7). Create a new, separate object — for example a
`CellDisplay` configuration object — that holds the five display constants (`size`,
`borderWidth`, `aliveColor`, `deadColor`, `borderColor`, `step`). The `Cell` class retains
only `x`, `y`, `toString()`, and `fromString()`. Update all import sites to reference
`CellDisplay` for rendering concerns and `Cell` for coordinate concerns.

---

## Smell 2: `rules.js` imports `Cell` — a display class (`life/rules.js`)

### What the smell is

`rules.js` imports `Cell` and uses it for two coordinate operations: constructing cells with
`new Cell(x, y)` and parsing strings with `Cell.fromString`. It has no interest whatsoever in
colours or pixel sizes — yet it must import the whole `Cell` class, including all those display
constants.

### Why it is a problem

**SOLID — Dependency Inversion (D).** The Dependency Inversion Principle says high-level
modules (domain logic, like the game rules) should not depend on low-level modules (rendering
infrastructure). The rules of Conway's Game of Life are conceptually independent of how cells
are drawn on screen. That independence should be visible in the code. Currently it is not:
`rules.js` can only be understood or reused alongside rendering concerns.

**SOLID — Interface Segregation (I).** A module should not be forced to depend on things it
does not use. `rules.js` does not use `Cell.aliveColor` or `Cell.size`, yet it is coupled to
them. If those constants change, `rules.js` is technically affected — even though it does not
care about them.

**Fowler — Feature Envy.** Feature Envy is the smell of a function (or module) that uses
another object's data more than its own. Here the reverse is a kind of forced dependency
envy: `rules.js` is being made to carry a dependency on rendering data it has no use for.

### The refactoring

This smell is resolved as a natural consequence of fixing Smell 1. Once `Cell` is split and
the display constants move to `CellDisplay`, `rules.js` can import only the pure coordinate
class. No changes to the logic of `rules.js` are needed — only the import changes.

---

## Smell 3: Coordinate math duplicated across three files

### What the smell is

The formula for converting between cell coordinates and screen pixel positions appears
independently in three places:

- `life/app.js` — `cellToScreen` and `cellFromScreen`
- `tests/unit/helpers.js` — `clickCell`'s `x: this.width / 2 + cellX * Cell.step, ...`
- `tests/e2e/helpers.js` — `Canvas.cellPosition`, `Canvas.originX`, `Canvas.originY`

### Why it is a problem

**Fowler — Duplicated Code.** Duplicated Code is one of the most fundamental smells. If the
coordinate formula ever needs to change (for instance, when adding the pan offset that
`CLAUDE.md` mentions as a planned feature), every copy must be found and updated consistently.
Miss one and the tests will silently use a different formula from the production code, which
undermines the entire purpose of having tests.

**Freeman & Pryce — test helpers that re-derive production logic.** This is the most
dangerous form of duplication. If the production formula contains a bug, a test helper that
independently implements the same formula may contain the same bug — and so the test will
pass even though the production code is wrong. Test helpers should exercise production code,
not shadow it.

**SOLID — Single Responsibility (S) / Don't Repeat Yourself.** Knowledge of the coordinate
system has one owner — it should be expressed once, in one place, from which all consumers
(production code and test helpers alike) derive it.

### The refactoring

**Extract Function** (Fowler, Ch. 6), then **Move Function** (Fowler, Ch. 8). Extract the
coordinate conversion into a named function (or small module) that lives alongside `app.js`.
Both the production click-handler and the test helpers then import and call the same function,
rather than each maintaining their own copy of the formula.

---

## Smell 4: `createClickHandler` has an unused parameter (`life/app.js:54`)

### What the smell is

`createClickHandler(ui, canvas, originX, originY, cells)` receives `ui` as its first
argument but never references it inside the function body.

### Why it is a problem

**Fowler — Speculative Generality.** Speculative Generality is the smell of code that exists
"just in case" — hooks, parameters, or abstractions added for a hypothetical future need that
has not yet arrived. Dead parameters force every reader to ask: "Is this doing something
subtle I'm missing? Why is it here?" That cognitive overhead is paid by every future reader
for zero benefit.

**SOLID — Interface Segregation (I).** Every caller of `createClickHandler` must pass a `ui`
argument despite the function not using it. Callers are being burdened with a dependency they
cannot affect.

### The refactoring

**Change Function Declaration** (Fowler, Ch. 6) — specifically, _remove the parameter_.
Delete `ui` from the parameter list of `createClickHandler` and update the single call site
in `initApp`. This is a small, safe, mechanical change.

---

## Smell 5: `originX` / `originY` are a Data Clump (`life/app.js`)

### What the smell is

`originX` and `originY` are always calculated together, always passed together, and always
used together. They appear as a pair in `render(canvas, originX, originY, cells)`,
`renderCell(ctx, originX, originY, ...)`, `cellFromScreen(offsetX, offsetY, originX, originY)`,
`cellToScreen(originX, originY, x, y)`, and `createClickHandler(ui, canvas, originX, originY,
cells)`.

### Why it is a problem

**Fowler — Data Clumps.** Fowler observes that when the same two or three data items always
appear together, they belong in their own object. A useful test: if you removed one of them
from a parameter list, would the remaining parameters still make sense on their own? If not,
they are a clump. Here, `originX` alone is meaningless — you always need both.

**SOLID — Single Responsibility (S) / future maintainability.** The `CLAUDE.md` document
notes that pan support (`panX`/`panY`) is a planned feature. If panning is added as two more
loose parameters threaded through the same functions, the clump grows to four items and the
problem worsens. Encapsulating the concept now, while it is two items, is the right moment.

**Fowler — Long Parameter List.** Functions like `renderCell(ctx, originX, originY, cell,
color)` already have five parameters. Grouping the origin into an object reduces the visual
noise and makes each call site clearer.

### The refactoring

**Introduce Parameter Object** (Fowler, Ch. 6). Create a small `Viewport` (or `Origin`)
value object with `x` and `y` properties. Thread a single `viewport` argument through the
functions that currently take `originX, originY`. The calculation of `originX`/`originY` in
`initApp` moves into the constructor or factory of this object. When pan is eventually added,
`panX`/`panY` join the `Viewport` object — no function signatures change.

---

## Smell 6: `RenderedCell extends Cell` (`tests/e2e/helpers.js:60`)

### What the smell is

`RenderedCell` is a test helper class that extends the domain class `Cell`. It does so in
order to reuse `Cell`'s `x` and `y` constructor parameters and its display constants
(`aliveColor`, `deadColor`, `borderColor`, `size`, `borderWidth`).

### Why it is a problem

**Freeman & Pryce — never subclass concrete classes.** Freeman & Pryce argue that subclassing
a concrete class (one that was not designed as a base for extension) couples your new class to
the original's implementation details, not to a deliberate contract. If `Cell`'s constructor
gains a new parameter, `RenderedCell` breaks — even though the change has nothing to do with
pixel rendering. The coupling is invisible and fragile.

**SOLID — Liskov Substitution (L).** The Liskov Substitution Principle says that a subclass
must be safely usable in every context where its parent is used. A `RenderedCell` is not a
`Cell` in any meaningful domain sense — it is a test probe that reads pixel data from a
rendered canvas. It does not satisfy the spirit of the relationship `extends` implies.

**Fowler — Refused Bequest.** Refused Bequest is the smell of a subclass that inherits things
it does not need or want. `RenderedCell` inherits `toString()` and `fromString()` — neither
of which it uses. It is borrowing coordinate storage and display constants, not genuinely
specialising the concept of a cell.

Note: this smell is partially caused by Smell 1. Because `Cell` holds both coordinates _and_
display constants, `RenderedCell` inherits from it to get access to both. Once Smell 1 is
fixed and display constants live on their own object, the motivation for inheriting from
`Cell` disappears.

### The refactoring

**Replace Superclass with Delegate** (Fowler, Ch. 12). `RenderedCell` should hold `x` and
`y` as plain fields (no longer inherited) and import display constants directly from
`CellDisplay` (the class created when fixing Smell 1). The inheritance link is removed
entirely.

---

## Smell 7: Post-construction mutation in `RenderedCanvas.cell()` (`tests/e2e/helpers.js:241`)

### What the smell is

`RenderedCanvas.cell(x, y)` creates a `RenderedCell` and then assigns properties to it after
construction:

```js
const cell = new RenderedCell(x, y);
cell.posX = posX;      // set after new
cell.posY = posY;      // set after new
cell.imgData = await …; // set after new
```

The object is not in a usable state at the moment `new RenderedCell` returns.

### Why it is a problem

**Freeman & Pryce — objects should be valid at construction time.** An object that requires
external code to complete its initialisation is dangerous: any caller who forgets to perform
the setup steps will get a silently broken object. This makes the class harder to use
correctly and easier to use wrongly — the opposite of what good design aims for.

**Fowler — Temporary Field.** Temporary Field is the smell of instance variables that are
only populated in certain circumstances. `posX`, `posY`, and `imgData` are not available
after `new RenderedCell` — only after the factory method fills them in. That conditionality is
a signal that the construction process is incomplete.

### The refactoring

**Replace Constructor with Factory Function** (Fowler, Ch. 11), making the existing async
factory in `RenderedCanvas.cell()` the _only_ way to create a `RenderedCell`. The factory
computes `posX`, `posY`, and `imgData` before calling `new`, passing them all into the
constructor at once. The constructor stores them immediately. No `RenderedCell` can exist in a
partially-initialised state.

---

## Smell 8: `isAlive()` and `isDead()` duplicate their structure (`tests/e2e/helpers.js:109–135`)

### What the smell is

Both methods contain an identical nested `Array.from + every` loop. They differ only in which
colours they compare each pixel against:

```js
// isAlive checks:  borderColor vs aliveColor
// isDead checks:   borderColor vs deadColor
```

The structural skeleton — iterate over a grid, check each pixel, return whether all match —
is written out twice.

### Why it is a problem

**Fowler — Duplicated Code.** Any change to the pixel-checking logic (for example, to handle
sub-pixel rendering, to adjust the boundary detection formula, or to improve error messages on
failure) must be made in two places. Duplicated code accumulates maintenance debt: each copy
is an independent place where a bug can be introduced or a fix can be forgotten.

**SOLID — Single Responsibility (S).** The responsibility of "iterate over all pixels in a
cell and verify each one matches an expected colour scheme" is a single, coherent behaviour.
It should have one implementation.

### The refactoring

**Extract Function** (Fowler, Ch. 6). Extract the shared grid-iteration logic into a private
helper — something like `allPixelsMatch(expectedBorderColor, expectedBodyColor)` — that both
`isAlive()` and `isDead()` call with the appropriate colour arguments. Each public method
becomes a one-liner that names its intent and delegates the mechanics.

---

## Smell 9: Duplicate setup in unit tests (`tests/unit/life.test.js`)

### What the smell is

All three tests in `tests/unit/life.test.js` begin with the same four lines:

```js
const cells = new Set();
const ui = new MockUI();
initApp(ui, cells);
const canvas = ui.findElement('canvas');
```

### Why it is a problem

**Fowler — Duplicated Code.** When setup changes — for example, if `initApp` gains a
parameter — every test must be updated individually. This is mechanical, error-prone work
that serves no purpose.

**Freeman & Pryce — test readability.** Tests should read as a description of the behaviour
under test. When every test begins with four lines of boilerplate before getting to what it
actually cares about, the signal is buried in noise. A reader has to scan past the setup each
time to find the interesting part.

### The refactoring

Move the shared setup into a `beforeEach` block (the Mocha equivalent of Fowler's **Extract
Function** applied to test setup). Declare `cells`, `ui`, and `canvas` in the suite scope;
assign them in `beforeEach`. Each test then begins immediately with the action it is
exercising.

---

## Suggested order of attack

The smells are not independent. The right sequence minimises rework: fix the root cause first,
then fix the things that depended on the root cause, and so on.

### Step 1 — Split `Cell` (fixes Smell 1)

This is the structural root cause of the most other smells. Do it first. Extract the display
constants (`size`, `borderWidth`, `aliveColor`, `deadColor`, `borderColor`, `step`) into a
new `CellDisplay` object. `Cell` retains only `x`, `y`, `toString()`, and `fromString()`.

### Step 2 — Fix the `rules.js` import (fixes Smell 2)

With `Cell` now a pure coordinate class, update the `rules.js` import. No logic changes —
only the dependency is corrected. This step is trivial once Step 1 is done.

### Step 3 — Replace `RenderedCell extends Cell` with delegation (fixes Smell 6)

With display constants no longer on `Cell`, `RenderedCell` has no remaining reason to inherit
from it. Remove the `extends Cell` relationship; hold `x` and `y` directly; import display
constants from `CellDisplay`. This step is significantly simpler after Step 1.

### Step 4 — Extract and centralise coordinate math (fixes Smell 3)

With the class structure now settled, extract the coordinate conversion formula into a shared
module. Update `app.js`, `tests/unit/helpers.js`, and `tests/e2e/helpers.js` to all import
and call the same function.

### Step 5 — Introduce Parameter Object for the viewport (fixes Smell 5)

With coordinate math centralised, the `originX`/`originY` pair is now the right target.
Create a `Viewport` value object; update all function signatures that currently take both as
separate arguments.

### Step 6 — Remove the unused `ui` parameter (fixes Smell 4)

A quick, isolated, mechanical change. Remove `ui` from `createClickHandler`'s parameter list
and its single call site.

### Step 7 — Fix post-construction mutation (fixes Smell 7)

Pass `posX`, `posY`, and `imgData` into `RenderedCell`'s constructor. The async factory
method in `RenderedCanvas.cell()` computes them before calling `new`.

### Step 8 — Extract shared pixel-checking helper (fixes Smell 8)

Extract the `Array.from + every` structure from `isAlive()` and `isDead()` into a private
`allPixelsMatch` helper.

### Step 9 — Consolidate test setup (fixes Smell 9)

Move the four repeated setup lines in `tests/unit/life.test.js` into a `beforeEach`.

---

### Why this order minimises work

Steps 1–3 address the class-boundary problems. Step 1 is the root cause: fixing it makes
Steps 2 and 3 trivial rather than complex. Step 4 is cleanest after the class structure is
stable (it involves changes to multiple files and you don't want to do it twice). Step 5
builds on Step 4 since the coordinate extraction clarifies what the "viewport" concept
actually is. Steps 6–9 are independent quick wins that can be done in any order; placing them
last keeps the early steps focused on the structural issues.
