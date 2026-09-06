# Refactoring Notes 2

This document is a follow-up to `refactoring_notes.md`. Two of the smells identified there
("`Cell` mixes domain identity with display constants" and "`rules.js` imports a display
class") have since been fixed (see commit `f0e4802`). This document re-examines the codebase
in its current state — `life/app.js`, `life/cell.js`, `life/rules.js`, and everything under
`tests/` — using the `growing-oos` and `refactoring` skills, and finds one **new defect** that
the earlier fix introduced, plus several smells that were flagged before but not yet fixed,
described here in more depth.

---

## Background: the principles referenced

- **Fowler** — Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed.,
  2018). A catalogue of "code smells" — surface symptoms of a design problem — and named,
  mechanical "refactorings" that remove them without changing behaviour.

- **Freeman & Pryce** — Steve Freeman & Nat Pryce, _Growing Object-Oriented Software, Guided
  by Tests_ (2012, "GOOS"). Its central claim: tests are a design tool. When a test is hard to
  write, awkward to read, or requires a wall of setup, that difficulty is _feedback_ about the
  production design, not just a testing inconvenience.

- **SOLID** — five principles of object-oriented design (Robert C. Martin):
  - **S**ingle Responsibility — a class/module should have only one reason to change.
  - **O**pen/Closed — open for extension, closed for modification.
  - **L**iskov Substitution — a subtype must be usable wherever its supertype is expected,
    without surprising the caller.
  - **I**nterface Segregation — clients shouldn't be forced to depend on methods they don't use.
  - **D**ependency Inversion — depend on abstractions, not concrete details.

---

## The smells

### Smell 1 (new, urgent): `MockUI.clickCell` references a constant that no longer exists — a live, masked bug

**Where:** `tests/unit/helpers.js:25-26`

```js
clickCell(cellX, cellY) {
    this.click({
        x: this.width / 2 + cellX * Cell.step,
        y: this.height / 2 - cellY * Cell.step
    });
}
```

`Cell` no longer has a `.step` property — it was moved to `DisplayCell.step` when Smell 1 from
the previous notes was fixed. `Cell.step` is therefore `undefined`, so `cellX * Cell.step` is
`NaN` for any non-zero `cellX`, and every call to `clickCell` computes `{ x: NaN, y: NaN }`.

**Why you haven't noticed:** the only test that exercises this path is:

```js
test('Clicking on a cell twice leaves it dead', () => {
    ...
    canvas.clickCell(1, 1);
    canvas.clickCell(1, 1);
    expect(cells).to.deep.equal(new Set());
});
```

Both calls compute the _same_ `NaN` coordinates, so `cellFromScreen` produces the same
(nonsensical) cell both times, and toggling it twice still leaves it out of the set. The test
passes — not because the behaviour is correct, but because the bug is symmetric. This is
exactly the trap Freeman & Pryce warn about: a test that only asserts the _final_ state, after
an even number of state flips, can pass "vacuously" (their term, used for asynchronous tests
that check a status the system was already in — the same failure mode applies here). The test
gives you no diagnostic information and would not catch a real regression in the click-to-cell
mapping.

**Why it's bad (beyond "it's a bug"):** this is what happens when a **Divergent Change**
refactor (Smell 1 in the previous notes) is applied to production code but the ripple isn't
followed into every consumer. `Cell.step` was public API that a test helper depended on;
removing it silently should have been caught by a _compile-time_ signal, but JavaScript has no
such thing for property access — `undefined * n` is `NaN`, not a `TypeError`. This is also a
symptom of **Duplicated Code** (see Smell 2): if there were a single, shared conversion
function between cell and screen coordinates, there would be nowhere else for a stale constant
reference to hide.

**The fix:** covered by the refactoring for Smell 2 below — once cell↔screen conversion is
extracted into one shared module that both `app.js` and the test helpers import, this constant
reference is replaced by a call to that module, and the stale reference disappears as a
byproduct. In addition, replace the test's "click twice, assert empty" pattern with something
that also verifies the middling state (click once, assert the cell is present; click again,
assert it's gone) — this converts a vacuous round-trip check into two real assertions,
per GOOS's "**precise assertions**" guidance ("specify precisely what should happen and no
more" cuts both ways: it also means don't specify _less_ than what should happen).

---

### Smell 2: coordinate math duplicated across three files

**Where:**

- `life/app.js` — `cellToScreen` and `cellFromScreen`
- `tests/unit/helpers.js` — `MockUI.clickCell` (the buggy line above)
- `tests/e2e/helpers.js` — `Canvas.originX`, `Canvas.originY`, `Canvas.cellPosition`, and
  `RenderedCell.hasBorderPixel` (which independently re-derives cell/border geometry)

All four places encode the same fact: "a cell's screen position is the viewport origin plus/minus
`cell.coord * DisplayCell.step`, with Y inverted." They were written independently and have
already drifted (Smell 1 is proof of that).

**Why it's bad:**

- **Fowler — Duplicated Code**: "the most important of the smells," because every future
  change to the coordinate formula (e.g. adding a zoom factor, per the `TODO.md` roadmap) must
  be made correctly in all three-plus places, or the system and its tests silently disagree
  about what a "cell" is on screen.
- **SOLID — Single Responsibility**: three unrelated modules (the app's render loop, a
  synchronous unit-test double, and an async Playwright helper) have each taken on the
  responsibility of "know the coordinate system," which should belong to one thing.
- **GOOS — "the difficulty is telling you something"**: needing to reimplement the same
  geometry to build a _test double_ is a classic signal that the geometry itself is not yet a
  proper collaborator/abstraction in the production code — it's implicit knowledge scattered
  through functions instead of an explicit object.

**The refactoring:** **Extract Class**, then **Move Function**, to create a single
`Viewport` (or `CoordinateSystem`) class living in `life/` (e.g. `life/viewport.js`), owning
`originX`/`originY` and exposing `toScreen(cell)` and `fromScreen(x, y)`. Steps:

1. Create the class with a constructor taking `(originX, originY)`.
2. Move `cellToScreen`'s body into `toScreen`, `cellFromScreen`'s body into `fromScreen`
   (Move Function — Fowler notes to move the whole body first, then adjust for the new
   context).
3. Update `app.js` to construct one `Viewport` and call its methods instead of the free
   functions.
4. Update `tests/e2e/helpers.js`'s `Canvas` to _use_ `Viewport` (composition) rather than
   reimplementing `cellPosition`/`originX`/`originY` — this is also **Remove Middle Man** in
   reverse: `Canvas` currently _is_ a hand-rolled viewport; make it delegate to the real one.
5. Update `tests/unit/helpers.js`'s `clickCell` to use the same `Viewport.toScreen`, which
   removes the dangling `Cell.step` reference (Smell 1) entirely.
6. Run the full test suite after each step (Fowler's cardinal rule: small steps, tests green
   throughout).

This single refactor is worth doing early: it has the highest fan-out of any smell here, and
several other smells below (the data clump, the `hasBorderPixel` magic formula) shrink to
almost nothing once it's done.

---

### Smell 3: `originX`/`originY` are a Data Clump threaded through every function signature

**Where:** `life/app.js` — `cellToScreen(originX, originY, x, y)`, `renderCell(ctx, originX,
originY, cell, color)`, `render(canvas, originX, originY, cells)`, `cellFromScreen(offsetX,
offsetY, originX, originY)`, `createClickHandler(ui, canvas, originX, originY, cells)`.

**Why it's bad:**

- **Fowler — Data Clump**: "whenever you see the same two or three data items together in lots
  of places... it's time for [them] to have their own [object]." The tell-tale sign is: if you
  deleted one of the two parameters from a function's argument list, would the other one still
  make sense alone? Here, no — `originX` is meaningless without `originY`.
- **SOLID — Single Responsibility**, again: every function that takes `(originX, originY)` has
  implicitly taken on responsibility for the viewport's positioning concept, when all it
  actually wants is "convert this cell to a point" or "draw at this point."
- **Long Parameter List** compounds this: `render` and `createClickHandler` both have to
  thread the pair through unchanged just to hand it to a nested call, which is pure noise for a
  reader trying to understand what each function actually _does_ with its inputs.

**The refactoring:** this is resolved as a side effect of Smell 2's `Viewport` extraction
(**Introduce Parameter Object**, specialised here to a full class with behaviour rather than a
plain struct, since the object also needs the `toScreen`/`fromScreen` methods). Once `Viewport`
exists, `render(canvas, viewport, cells)` and `renderCell(ctx, viewport, cell, color)` take one
meaningful parameter instead of two coordinates that only make sense as a pair.

---

### Smell 4: `createClickHandler` takes an unused parameter

**Where:** `life/app.js:102` — `createClickHandler(ui, canvas, originX, originY, cells)`. The
`ui` parameter is never referenced in the function body.

**Why it's bad:**

- **Fowler** doesn't name this smell directly, but it is a close cousin of **Speculative
  Generality**: a parameter that isn't used is either a leftover from a previous design (dead
  weight) or a hook for something that hasn't been built yet (a guess about future need).
  Fowler's advice for both is the same: remove it now; add it back — with `Change Function
Declaration` — when a real caller needs it. YAGNI ("you aren't gonna need it") is one of the
  book's recurring themes.
- **SOLID — Interface Segregation** (loosely applied to a function's own parameter list): a
  caller of `createClickHandler` is forced to know about and supply a `ui` object that the
  function doesn't actually depend on. That's a tiny but real violation of "don't make clients
  depend on things they don't use."
- **GOOS — dead parameters as a readability defect**: a function signature is meant to
  communicate everything the function needs from its context. An unused parameter actively
  misleads a reader into thinking `ui` matters to click handling, sending them on a wild goose
  chase.

**The refactoring:** **Change Function Declaration** to drop the unused parameter, then update
the one call site (`initApp`) to stop passing it. This is a two-minute, zero-risk fix with no
dependents — a good "quick win" to do before touching anything else, so it isn't lost in the
noise of a larger diff later.

---

### Smell 5: live cells are represented as raw strings everywhere (Primitive Obsession / "No String Types")

**Where:** pervasive — `rules.js` (`Set<String>` in/out, `Cell.fromString`/`.toString()` calls
in both `next()` and `neighbours()`'s call sites), `app.js` (`toggleCell`, the two loops in
`render`, `createClickHandler`), and all three test files, which build cell sets as
`new Set(['0,0', '0,1', ...])`.

**Why it's bad:**

- **GOOS — "No String Types"**: Freeman & Pryce are explicit that raw strings standing in for a
  domain concept are a smell — they give you nowhere to attach behaviour, and every consumer
  has to know the encoding (`"x,y"`, comma-separated, in that order) instead of asking an
  object a question. Here the string _is_ the entire public contract for "a live cell," even
  though a perfectly good `Cell` class already exists.
- **Fowler — Primitive Obsession**: the fix category is literally named for this: "replace the
  primitive with an object." The giveaway is the amount of code whose only job is converting
  between the primitive and the richer type — `Cell.fromString` and `.toString()` are called
  in `rules.js` twice, `app.js` three times, and are implicit in every test's `Set` literal.
- **Why `Cell` isn't already used directly**: `Cell` has no value equality — two `new Cell(0,
0)` instances are `!==` each other, so `Set.prototype.has`/`.delete` (reference equality)
  can't be used to track live cells if the set held `Cell` objects directly. The string
  encoding is a workaround for this missing capability, not a deliberate design choice — which
  is exactly the kind of implicit, load-bearing assumption GOOS warns will surprise the next
  person who touches the code.
- **SOLID — Single Responsibility**, inverted: because there's no object responsible for "the
  set of live cells," that responsibility is smeared across `app.js` and `rules.js`, each of
  which re-implements bits of it (`toggleCell` in `app.js`; the survive/birth logic in
  `rules.js`) against the raw `Set<String>`.

A smaller, related smell: `toggleCell(cell, cells)` in `app.js` names its first parameter
`cell`, but it's actually the _string_ returned by `cellFromScreen(...).toString()` — a
**Mysterious Name** (Fowler) that misleads a reader into expecting a `Cell` instance.

**The refactoring:**

1. **Extract Class** to introduce a `Board` (or `LiveCells`) class that _encapsulates_ the
   `Set<String>` internally (this is **Encapsulate Collection**: the raw set is never handed
   out or manipulated directly by callers again). Give it a small, intention-revealing API:
   `has(cell)`, `toggle(cell)`, `add(cell)`, and iteration that yields `Cell` objects (not
   strings) via a generator or `[Symbol.iterator]`.
2. Inside `Board`, keep the string encoding as a private implementation detail used only for
   the underlying `Set`'s hashing — `Cell.toString()`/`Cell.fromString()` calls collapse to one
   place instead of five.
3. Update `rules.js`'s `next(cells)` to accept and return a `Board`, moving the
   iterate/count/decide logic to operate on `Cell` objects throughout (no `.toString()` calls
   needed outside `Board`).
4. Update `app.js`'s `toggleCell` to become `board.toggle(cell)` (a one-line call, probably
   inlinable — see **Inline Function** — once the logic lives on `Board`), and rename any
   remaining string-shaped local variables.
5. Update tests to construct `Board` instances (potentially via a small **Test Data Builder**,
   see Smell 8) instead of raw `Set` literals, or keep the literals but pass them through a
   `Board.from([...])` factory — either way, tests stop needing to know the internal
   `"x,y"` string format at all, which is exactly GOOS's point: tests should talk about
   _cells_, not about how cells happen to be serialised today.

This is the largest single refactor in this document, so it's scheduled after the smaller,
purely-mechanical wins (Smells 1–4) and the `Viewport` extraction — doing coordinate cleanup
first avoids touching the same lines twice.

---

### Smell 6: `next()` conflates two phases of the algorithm in one loop

**Where:** `life/rules.js:41-67`. The single `for` loop over live cells simultaneously (a)
counts each live cell's live neighbours to decide survival, and (b) accumulates a counter of
_dead_ neighbours across all live cells, to later decide births.

**Why it's bad:**

- **Fowler — Split Loop / Split Phase**: "a loop that does two different things" is a
  smell even when — especially when — it's efficient, because the reader has to hold two
  unrelated computations in their head simultaneously to understand any one line. Fowler is
  explicit that combining loops for a performance win should be treated as a deliberate,
  measured optimisation applied _after_ clarity, not the default way to write the loop the
  first time.
- The `counter` object is also a **Primitive Obsession** instance in miniature: a plain
  `{}` used as a multiset (`counter[key] = key in counter ? counter[key] + 1 : 1`) is exactly
  the kind of hand-rolled data structure Fowler suggests replacing — here with a `Map`, which
  removes the `key in counter` ceremony and any theoretical risk of colliding with
  `Object.prototype` property names.
- **SOLID — Single Responsibility**: `next()` currently has two reasons to change (a change to
  the survival rule, and a change to the birth rule), even though the two rules are logically
  independent per Conway's rules.

**The refactoring:** **Split Phase**. Extract a `survivors(cells)` function (the live cells
that stay alive) and a `births(cells)` function (the dead neighbours to bring to life), each
with its own internal loop, and have `next()` become a short composition of the two:
`new Set([...survivors(cells), ...births(cells)])`. Use a `Map` in `births` instead of a plain
object. This is deliberately scheduled _after_ Smell 5 (the `Board` extraction), because once
cells are `Cell` objects wrapped by `Board`, the counting logic naturally operates on that API
rather than on raw strings, and there is no value in writing the split twice.

---

### Smell 7: `RenderedCell extends Cell` — inheritance used for convenience, not "is-a"

**Where:** `tests/e2e/helpers.js:61` — `class RenderedCell extends Cell { ... }`, adding
`pixel()`, `pixelData()`, `hasBorderPixel()`, `isAlive()`, `isDead()`.

**Why it's bad:**

- **SOLID — Liskov Substitution**: LSP isn't only about breaking behaviour; it's a prompt to
  ask "is every `Cell` interchangeable with a `RenderedCell` and vice versa, conceptually?"
  Here the answer is no — a `RenderedCell` only makes sense in the context of a rendered
  Playwright page (it needs `imgData`, `posX`, `posY` to do anything useful), while a `Cell` is
  a pure coordinate pair used throughout the domain. Subclassing a **production, domain**
  class from a **test-only** class inverts the dependency the wrong way: domain code should
  never need to know or care that a test-only subtype of one of its classes exists, but the
  coupling is now baked into the class hierarchy rather than confined to test files.
- **GOOS — Context Independence**: `Cell` is meant to be usable anywhere without dragging in
  unrelated context. `RenderedCell` doesn't strengthen that; it just borrows `x`/`y`/`toString`
  for convenience, which composition would give it just as easily without polluting the
  inheritance chain.
- Practically: if `Cell` ever grows a method that doesn't make sense for a `RenderedCell` (or
  vice versa), the inheritance link will force an awkward override or an "empty" method just to
  keep the hierarchy consistent — the classic setup for a later **Refused Bequest**.

**The refactoring:** **Replace Superclass with Delegate** (or, since this is new-ish code
rather than an established hierarchy others depend on, simply stop extending and use
composition from the start): give `RenderedCell` a `cell` field (a plain `Cell`), forward
`x`/`y`/`toString()` to it via **Hide Delegate**, and keep `pixel`/`isAlive`/`isDead` as
`RenderedCell`'s own behaviour. `RenderedCanvas.cell(x, y)` then does
`new RenderedCell(new Cell(x, y), imgData)` instead of relying on the inherited constructor.

---

### Smell 8: post-construction mutation in `RenderedCanvas.cell()`

**Where:** `tests/e2e/helpers.js:241-251`:

```js
async cell(x, y) {
    const cell = new RenderedCell(x, y);
    const [posX, posY] = this.cellPosition(cell);
    cell.posX = posX;
    cell.posY = posY;
    cell.imgData = await this.cellImgData(cell);
    return cell;
}
```

**Why it's bad:**

- **Fowler — Temporary Field / incomplete object construction**: between `new RenderedCell(x,
y)` and the final `return cell`, the object exists in a state where `posX`, `posY`, and
  `imgData` are all `undefined`, yet nothing stops another piece of code from observing or
  calling a method on it mid-construction (e.g. if this function is later refactored and an
  `await` is added before the mutations, or an exception is thrown between them). A
  fully-constructed object should be usable the instant its constructor returns; here, three
  extra statements are load-bearing for correctness but are not enforced by the language or the
  class itself.
- **SOLID — Single Responsibility**, applied to _when_ responsibility is discharged: object
  construction and object population are two different concerns that have been separated in
  time without any name or checkpoint marking the boundary, which makes `cell()` do the job
  that a constructor or factory should be doing.
- This is also necessary only _because_ `imgData` requires an `async` fetch (`cellImgData`),
  which a synchronous constructor can't perform — a real constraint, but one that a factory
  function is the idiomatic way to solve, not ad hoc field assignment on the caller's side.

**The refactoring:** **Replace Constructor with Factory Function**. Move the async fetch and
field assignment into a static async factory on `RenderedCell` itself:

```js
static async at(cell, canvas) {
    const [posX, posY] = canvas.cellPosition(cell);
    const imgData = await canvas.cellImgData({ posX, posY });
    return new RenderedCell(cell, posX, posY, imgData);
}
```

so that `RenderedCell`'s constructor takes all its fields as arguments and the object is
complete the moment it exists. `RenderedCanvas.cell(x, y)` becomes a one-line delegation to
`RenderedCell.at(...)`. Do this together with Smell 7, since both touch the same class and
constructor.

---

### Smell 9: `isAlive()` and `isDead()` duplicate their entire structure

**Where:** `tests/e2e/helpers.js:109-135`. Both methods build the same nested
`Array.from({length: step}, ...)` grid and call `hasBorderPixel` identically; the only
difference is which two color constants (`aliveColor`/`deadColor`) are compared against.

**Why it's bad:**

- **Fowler — Duplicated Code**, textbook case: two blocks that are identical except for one or
  two literal values are a direct prompt for **Parameterize Function** — "when you see two
  functions that differ only in a literal value, you can combine them via a parameter."
  Duplicated structure like this also means every future change to how a cell's colour is
  checked (e.g. adding anti-aliasing tolerance) has to be made twice, correctly, in sync.
- Worth noting as a positive counter-example from GOOS: the book explicitly says test code is
  allowed _more_ duplication than production code, where duplication aids readability of a
  single scenario. This case doesn't qualify for that exemption, though — it isn't "a little
  duplication for clarity," it's two ~15-line methods that are structurally identical, which
  tips it back into a genuine smell rather than an acceptable readability trade-off.

**The refactoring:** **Parameterize Function**. Replace both with:

```js
isColor(bodyColor) {
    return Array.from({ length: DisplayCell.step }, (_, x) =>
        Array.from({ length: DisplayCell.step }, (_, y) => {
            const pixel = this.pixel(x, y);
            return this.hasBorderPixel(pixel)
                ? pixel.color === DisplayCell.borderColor
                : pixel.color === bodyColor;
        })
    ).every((row) => row.every(Boolean));
}
```

and expose `isAlive()`/`isDead()` as one-line callers (`isColor(DisplayCell.aliveColor)` /
`isColor(DisplayCell.deadColor)`) if the two names are still worth keeping for readability at
call sites — or **Inline Function** them away entirely if callers are happy to call
`isColor(...)` directly.

---

### Smell 10: duplicated setup across unit tests

**Where:** `tests/unit/life.test.js` — all three tests open with the same three lines:

```js
const cells = new Set();
const ui = new MockUI();
initApp(ui, cells);
const canvas = ui.findElement('canvas');
```

**Why it's bad:**

- **GOOS — "Streamline Test Code"**: setup that doesn't contribute to the description of the
  specific scenario under test should be moved out of the test body, so the reader's eye goes
  straight to what's _different_ about this test versus its neighbours. Right now, a reader
  has to diff four lines across three tests to find out that nothing there is scenario-specific
  at all — pure noise.
- **Fowler — Duplicated Code**, applied to test code, still counts once it's this
  mechanical and appears three-for-three (the "Rule of Three": the third repetition is the
  trigger to extract).

**The refactoring:** **Extract Function** a small helper — e.g. `createTestApp()` returning
`{ cells, canvas }` — in `tests/unit/helpers.js`, and have each test call it as its one line of
setup. This is a low-risk, purely local cleanup with no dependents elsewhere, so it's fine to
leave until last.

---

## Suggested order of work

The guiding idea, per Fowler, is to do the smallest, most self-contained refactorings first,
then tackle the refactorings with the widest "fan-out" (the ones that touch the most other
code) before the smells that depend on their result — so that no line of code has to be edited
twice for two different reasons.

1. **Smell 4 — remove the unused `ui` parameter.** Zero dependencies, zero risk, two minutes.
   Do it first purely to get it out of the way before larger diffs land.

2. **Smell 2 (which also fixes Smell 1) — extract a shared `Viewport` class for cell↔screen
   conversion**, used by `app.js`, `tests/unit/helpers.js`, and `tests/e2e/helpers.js`'s
   `Canvas`. This is the highest-leverage refactor in the list: it eliminates the duplicated
   math, fixes the live `Cell.step` bug as a direct consequence, and — as described in Smell 3
   — simultaneously resolves the `originX`/`originY` data clump by giving that pair a proper
   home. Doing this before anything else in `tests/e2e/helpers.js` (Smells 7–9) means those
   later refactors edit a `Canvas` that's already simplified, instead of duplicating effort.

3. **Smell 5 — encapsulate live cells behind a `Board` class**, removing the pervasive
   string/`Cell` conversion duplication in `app.js` and `rules.js`. This is the largest single
   change; doing it after step 2 means the coordinate-conversion code is already stable and
   won't need touching again as part of this step.

4. **Smell 6 — split `next()` into `survivors`/`births`.** Deliberately sequenced right after
   Smell 5, since it operates on the same code and is far simpler to do once `next()` is
   already working against the new `Board` API rather than raw strings.

5. **Smells 7 + 8 — replace `RenderedCell extends Cell` with composition, and replace
   post-construction mutation with a factory function.** Grouped together because they touch
   the same class and constructor in `tests/e2e/helpers.js`; doing them in the same pass avoids
   re-editing `RenderedCanvas.cell()` twice.

6. **Smell 9 — parameterize `isAlive`/`isDead` into `isColor`.** Same file as step 5; cheap
   enough to fold into the same commit/session once you're already in `RenderedCell`.

7. **Smell 10 — extract shared unit-test setup.** Purely local, no dependents, safe to do
   whenever — last, as low-risk polish once everything it sets up (`initApp`, `MockUI`) has
   settled from the refactors above.

This ordering front-loads the two structural refactors (`Viewport`, `Board`) that everything
else either depends on or would otherwise duplicate, fixes the one live defect as a side effect
of the first structural refactor rather than as a bolt-on patch, and leaves the purely
cosmetic/local cleanups (unused parameter, test setup duplication) for whenever they're
convenient, since they carry no risk of being redone.
