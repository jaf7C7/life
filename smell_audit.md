# Smell audit: `life`

**Scope:** all production code in `life/` (`app.js`, `cell.js`, `rules.js`, `ui.js`,
`viewport.js`, `index.html`) and all test code in `tests/unit/` (`helpers.js`, `life.test.js`,
`rules.test.js`, `viewport.test.js`) and `tests/e2e/` (`helpers.js`, `life.test.js`). Tooling
config (`eslint`, `prettier`, `playwright`, git hooks) was out of scope.

**Method:** every file was read in full. A first pass used the `growing-oos` skill (Freeman &
Pryce: test-driven design feedback, test-double quality, Tell Don't Ask, Context Independence,
No String Types). A second pass used the `refactoring` skill (Fowler's smell catalogue) to
corroborate and extend. Claims were then checked mechanically: both suites were run (18 unit
tests and 12 e2e tests, all passing), symbol usages were grepped, and one suspected test bug was
reproduced with a throwaway script (Smell 1).

---

## Background: the principles referenced

- **Fowler**: Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed.,
  2018). A catalogue of "code smells" (surface symptoms of a design problem), each paired with
  named, mechanical "refactorings" that remove the smell without changing observable behaviour.
  The discipline is small steps, with the tests run after every one. That only works if the
  tests would actually catch a mistake.

- **Freeman & Pryce**: Steve Freeman & Nat Pryce, _Growing Object-Oriented Software, Guided by
  Tests_ (2012, "GOOS"). Central claim: tests are a design tool. When a test is hard to write,
  needs a pile of setup, or has to know about the code's internals, that's feedback about the
  production design. Key ideas used below:
  - **Tell, Don't Ask**: tell an object what to do instead of pulling its state out and
    deciding for it.
  - **Context Independence**: an object should depend only on what it needs, and receive it
    explicitly.
  - **No String Types**: domain concepts deserve their own types, not raw strings or numbers.
  - **Only mock types you own**: fake your own interfaces (ports), not third-party/platform
    APIs whose real behaviour you don't control.
  - **Test for information, not representation**: assert on what a value means, not how it
    happens to be encoded.

- **SOLID**: five object-oriented design principles (Robert C. Martin). Only these come up
  below:
  - **Single Responsibility Principle (SRP)**: a module should have one reason to change.
  - **Dependency Inversion Principle (DIP)**: high-level policy should depend on abstractions
    it defines, not on concrete low-level details. Low-level details implement those
    abstractions.
  - **Interface Segregation Principle (ISP)**: clients shouldn't depend on more of an interface
    than they use.

---

## The smells

### Smell 1: the unit-test `clickCell` clicks the wrong cell, and the test using it can't tell

**Where:** `tests/unit/helpers.js:52-56` (`clickCell`), used by
`tests/unit/life.test.js:135-147` ("Clicking on a cell twice leaves it dead").

`clickCell` computes a cell centre with `cellCentre(this, cell)`, which returns **canvas
(backing-store) pixels** based on `width: 300, height: 150`. It then passes that point to
`click()`, which is documented (lines 40-45) as taking **CSS pixels**. The app scales that
input by `width/clientWidth = 1.5` and `height/clientHeight = 0.375` (`app.js:86-90`). The
point lands in a completely different cell.

**Verified:** a scratch script calling `initApp(new MockUI(), cells)` then
`canvas.clickCell(1, 1)` leaves `cells` as `{'5,3'}`, not `{'1,1'}`. The test still passes,
because its first assertion is `expect(cells).not.to.deep.equal(new Set())`: "something got
toggled", not "cell 1,1 got toggled". Toggling `5,3` twice also empties the set, so the second
assertion passes too.

**Why it's bad:**

- **Freeman & Pryce: specify precisely what should happen.** The test's name promises
  behaviour about a specific cell, but the assertion is loose enough to accept any cell. A
  test that passes whatever the code does isn't protecting anything. Here it also hides a
  broken helper that any future test would copy.
- **Freeman & Pryce: No String Types (for units).** The root cause is that "canvas pixels" and
  "CSS pixels" are both bare `number`s, so nothing stops one being passed where the other is
  expected. The test file's own comments (`life.test.js:47-55`, `76-78`) show the author
  already had to reason carefully about this distinction. When a distinction needs that much
  commentary, it should be a type.
- **Fowler: refactoring depends on tests.** Every later refactoring in this report counts on
  the unit suite to catch regressions. This test has a hole in exactly the area (coordinate
  mapping) that Smells 2 and 5 change.

**The refactoring:** first fix the test, then the helper. This is test repair, not refactoring
(Fowler's "two hats"), so do it on its own.

1. Tighten the assertion to `expect(cells).to.deep.equal(new Set(['1,1']))`. Run it and
   **watch it fail** (GOOS: confirm it fails for the right reason, i.e. it reports `5,3`).
2. Fix `clickCell` by converting the canvas-pixel centre to CSS pixels before calling
   `click()`: `x * clientWidth / width`, `y * clientHeight / height`. The test file already
   has this conversion as `canvasToCssX`/`canvasToCssY` (`life.test.js:14-29`). Move those
   two functions into `helpers.js` and call them from `clickCell` (this is **Move Function**).
3. Run the suite. The test should now pass with the precise assertion.
4. Smell 2 removes the underlying ambiguity by giving the two pixel spaces explicit homes.

---

### Smell 2: every viewport function takes a whole "canvas" but only wants its dimensions

**Where:** `life/viewport.js`: `visibleCells`, `cellCentre`, `getOrigin`, `cellPosition`,
`cellBodyPosition`, `cellAtPosition` all take `canvas` as their first argument and only read
`canvas.width` and `canvas.height`. `life/app.js:86-90` (`cssToCanvas`) does the related
CSS→canvas transform using `clientWidth`/`clientHeight`, but in a different module. Callers
pass several kinds of object as "the canvas": a real `HTMLCanvasElement` (`app.js`), the
`MockUI` fake (`tests/unit/helpers.js:54`), bare `{ width, height }` literals
(`tests/unit/viewport.test.js`), and a Playwright `RenderedCanvas` whose `width`/`height` are
**CSS** dimensions from `boundingBox()` (`tests/e2e/helpers.js:189-194, 217, 234`).

**Verified:** grepped every call site listed above. The e2e case works today only because
`index.html` gives the canvas no CSS size, so its CSS box happens to match its 300×150 backing
store. The e2e suite passes (12/12). Adding a CSS `width` to the canvas would make
`RenderedCanvas.cell()` read pixels from the wrong place, the same class of error as Smell 1.

**Why it's bad:**

- **Freeman & Pryce: Context Independence.** These functions are pure geometry: "given a grid
  of this size, where is cell (x, y)?". But their signatures say they depend on a canvas.
  The unit tests show the real dependency by passing `{ width, height }`. Code that tests can
  satisfy with a two-field literal is telling you what it actually needs.
- **SOLID: ISP.** Callers are made to supply "a canvas" when the functions only use two numbers
  from it. That is what lets a `RenderedCanvas` with the wrong kind of `width` slip through.
- **Fowler: Data Clumps / Combine Functions into Class.** Six functions all take the same first
  argument and all begin by deriving the same origin (`getOrigin`, called from three of them).
  Fowler's signal for a missing class is a group of functions operating on the same data. The
  `[x, y]` arrays returned everywhere are a secondary **Primitive Obsession**: points with no
  type and no way to tell which pixel space they belong to.

**The refactoring:** **Combine Functions into Class**, then **Move Function** for
`cssToCanvas`.

1. Create `class Viewport { constructor(width, height) }` in `viewport.js`, where
   `width`/`height` are **canvas pixels**. Compute the origin once in the constructor. This is
   **Replace Temp with Query**/field for `getOrigin`.
2. Move each function in as a method one at a time (`visibleCells()`, `cellPosition(cell)`,
   `cellBodyPosition(cell)`, `cellAtPosition(x, y)`, `cellCentre(cell)`). While doing each one,
   leave the old free function as a one-line forwarder, `(canvas, …) => new Viewport(canvas.width,
canvas.height).method(…)`, so callers keep working. Run tests after each move.
3. Give the CSS transform an explicit home. Either add a `Viewport.fromElement(el)` factory
   that also records `clientWidth`/`clientHeight`, with a `cssToCanvas(x, y)` method, or keep
   a separate small `Scale` object. Either way, move `cssToCanvas` out of `app.js` (**Move
   Function**).
4. Migrate callers to construct a `Viewport` explicitly: `app.js`, both test helpers, and
   `viewport.test.js` (which becomes `new Viewport(w, h).visibleCells()`). For
   `RenderedCanvas`, read the backing-store size from the page
   (`locator.evaluate(el => [el.width, el.height])`), not `boundingBox()`, so the e2e helper
   uses canvas pixels like the production code does.
5. Delete the forwarders once nothing calls them.
6. Optionally, replace the returned `[x, y]` arrays with a small `{ x, y }` point (or
   `CanvasPoint`/`CssPoint`) to finish the job Smell 1 started. Take this as far as the
   distinction keeps causing confusion, and no further.

---

### Smell 3: cells are strings everywhere except where they're briefly `Cell`s

**Where:** the live-cell state is a `Set<string>` of `"x,y"` keys (`index.html:18`,
`app.js:32, 53, 64-67, 97`, `rules.js:27-41`). `Cell` exists (`cell.js`), but code converts in
and out of it constantly: `rules.js:45` parses every key to a `Cell`, `rules.js:49` and `:58`
turn `Cell`s back into strings, `app.js:57` parses again for rendering, and `app.js:103`
stringifies the clicked cell. `newCells` (`rules.js:30`) works directly on string keys of a
plain-object counter. The author has already marked three places in `app.js` with
`// SMELL: primitive obsession`.

**Verified:** all tests in `rules.test.js` and `life.test.js` build inputs and assert on outputs
as string literals (`'0,0'`, `'-1,-1'`, …), so the suite depends on the encoding.

**Why it's bad:**

- **Freeman & Pryce: No String Types.** "A live cell" is the central domain concept of the
  program, and it's represented as a formatted string. There's nowhere to attach behaviour
  (neighbours, equality), and nothing stops an unrelated string such as `"1, 1"` (with a
  space) being added. The type system can't help, and the tests can't be written without
  knowing the serialisation format.
- **Freeman & Pryce: test for information, not representation.** `expect(next(cells)).to
.include('0,0')` asserts on how a cell is encoded, not on which cell it is. If the encoding
  changes, every test changes, though no behaviour did.
- **Fowler: Primitive Obsession.** The string round-trips are what you get when a primitive
  stands in for an object. Each boundary converts, and the conversions (`fromString`,
  `toString`) spread across modules. The reason for the strings is legitimate: JS `Set`
  compares objects by reference, so two `new Cell(0, 0)` instances are distinct members. That
  argues for hiding the key inside one class, not for exposing it everywhere.

**The refactoring:** **Replace Primitive with Object**, in the form of a collection class that
owns the encoding (this also sets up Smell 4).

1. Create `class Population` (or `LiveCells`) in a new module. Internally it keeps a
   `Set<string>`. Its public API speaks only `Cell`: `has(cell)`, `add(cell)`,
   `delete(cell)`, `[Symbol.iterator]()` yielding `Cell`s, `size`, and a static
   `Population.of(...cells)` factory.
2. Make `Cell.toString`/`fromString` the private key functions used _only_ by `Population`.
   Leave them on `Cell` for now, but make `Population` their only production caller.
3. Change `rules.next` to accept and return a `Population`. Inside, the loop becomes
   `for (const cell of population)`, and the `neighbour.toString()`/`cells.has(key)` pairs become
   `population.has(neighbour)`. The neighbour counter can stay keyed internally for now (Smell 7
   restructures it).
4. Update `rules.test.js` to build inputs with `Population.of(new Cell(0, 0), …)` and assert with
   `population.has(new Cell(0, 0))`. For whole-set equality (the blinker test), add an
   `equals(other)` method or compare sorted cell lists. A tiny `cell(x, y)` test helper keeps
   the tests readable.
5. Migrate `app.js` and `index.html` to create and pass a `Population` (this overlaps with
   Smell 4. Do them together).

---

### Smell 4: the app mutates a raw `Set` it was handed, and tests assert through that shared reference

**Where:** `index.html:18-20` creates `new Set()` and passes it to `initApp`. `app.js:68-74`
(`toggleCell`) asks `cells.has(cell)` and then calls `delete`/`add` from outside. Every test in
`tests/unit/life.test.js` creates its own `Set`, passes it in, and then inspects that same
object after clicking (`expect(cells).to.deep.equal(...)`).

**Why it's bad:**

- **Freeman & Pryce: Tell, Don't Ask.** `toggleCell` asks the set whether it contains a cell,
  then decides for it what to do. "Toggle" is an operation on the population and belongs on
  the population. As a free function taking the collection as a parameter, it can't enforce
  anything about that collection.
- **Fowler: Mutable Data / Encapsulate Collection.** Fowler's rule is never to let a mutable
  collection escape unguarded, because anyone holding the reference can change it. Here the
  reference is shared between `index.html`, `initApp`, the click handler closure, and (in
  tests) the test body. That's how the tests observe state, but it also means the app has
  no control over its own state. Nothing today stops a caller mutating it between renders
  without the canvas updating.
- **Freeman & Pryce: listen to the tests.** The unit tests _need_ the shared mutable reference
  because the app offers no other observable output: `render` writes to a fake context that
  records nothing (Smell 5). The shared `Set` is a workaround for a missing seam.

**The refactoring:** **Encapsulate Collection** (continuing from Smell 3's `Population`) plus
**Move Function**.

1. Move `toggleCell` onto `Population` as `population.toggle(cell)` (**Move Function**). Delete
   the free function.
2. Keep `initApp(ui, population)` for now, but have the click handler call only
   `population.toggle(...)`, with no `has`/`add`/`delete` from outside.
3. Once Smell 5 provides a renderer port, change the click-handling unit tests to assert on
   what was _rendered_ (the cells passed to the fake renderer) rather than on the injected
   collection. The collection can then be owned by the app, and the tests stop depending on a
   shared mutable reference.

---

### Smell 5: `app.js` renders, handles input, converts coordinates, mutates state, and owns the colour scheme, against faked platform types

**Where:** `life/app.js` in full. `render`/`renderCell` (lines 21-47) draw directly with the
Canvas 2D API. `createClickHandler` (100-109) translates DOM events. `cssToCanvas` (86-90) is
coordinate maths. `toggleCell` (68-74) mutates state. The colour constants (9-11) are
styling. `renderCell(ctx, canvas, cell, color)` takes four parameters, two of which (`ctx`,
`canvas`) are always the same pair. In tests, `MockUI.createElement` (`tests/unit/helpers.js:14-66`)
returns a hand-rolled fake `HTMLCanvasElement` whose `getContext()` returns
`{ fillRect() {} }`.

**Verified:** the fake context doesn't record `fillRect` calls or `fillStyle` assignments, so
no unit test checks what is drawn. Rendering is covered only by the e2e suite, which is
slower and (Smell 8) partly derives its expectations from the production code.

**Why it's bad:**

- **SOLID: SRP / Fowler: Divergent Change.** This file changes if the colour scheme changes,
  if the drawing technique changes (e.g. to only redraw dirty cells), if input handling changes
  (drag to paint, touch), or if state semantics change. Those are four unrelated reasons to
  change one 130-line module.
- **Freeman & Pryce: only mock types you own.** The unit tests fake `HTMLCanvasElement` and
  `CanvasRenderingContext2D`, which are platform types. The fake is necessarily a guess about
  their behaviour (e.g. it has fixed `width`/`height`/`clientWidth`/`clientHeight`, which a real
  element computes from layout). Freeman & Pryce's alternative is to define a small interface
  in the app's own terms (a _port_: "draw these cells as dead, these as alive"). The app
  depends on the port, a thin canvas _adapter_ implements it, and the adapter is tested
  against the real browser.
- **SOLID: DIP.** The high-level policy ("when a cell is clicked, toggle it and redisplay")
  depends directly on a low-level detail (the Canvas 2D API). Inverting that gives the app an
  abstraction the unit tests can fake meaningfully, which is also the missing seam from
  Smell 4.
- **Fowler: Long Parameter List / Data Clump.** `renderCell(ctx, canvas, cell, color)`: `ctx`
  and `canvas` always travel together. They'd become fields of a renderer object.

**The refactoring:** **Extract Class** twice, with ports named after their role.

1. **Extract Class** `CanvasRenderer` (in e.g. `life/canvasRenderer.js`). Its constructor
   takes the canvas element and a `Viewport` (Smell 2). Its one method,
   `draw(population)`, contains the current `render` body. Move `renderCell` and the
   colour constants into it (**Move Function**, **Move Field**). `ctx` and `canvas` become
   fields, so `renderCell(cell, color)` has two parameters.
2. Define the port the app depends on. In JS this is a documented shape: `Display` with
   `draw(population)`. Have `initApp` receive a `display` (or a factory for one) instead of
   calling `render` itself.
3. **Extract Function** the click-to-cell mapping into the input side: a click handler that
   takes the CSS offset, uses the `Viewport`'s `cssToCanvas`/`cellAtPosition`, and calls
   `population.toggle(cell)` followed by `display.draw(population)`.
4. In unit tests, replace the fake 2D context with a fake `Display` that records the populations
   it was asked to draw. Tests like "Clicking on the center adds cell 0,0" can then assert
   "the last thing drawn contains exactly cell (0, 0)". This is a behaviour of the app, not a
   state probe. It also lets rendering-order logic (background, then dead grid, then live
   cells) be covered by a focused `CanvasRenderer` test in the browser, or left to e2e.
5. What remains in `app.js` is wiring (**Composite Simpler than the Sum of Its Parts**): make
   the viewport, the renderer, and the population, and connect the click handler.

---

### Smell 6: the `UI` port is misnamed, ignores its argument, and its fake doubles as a test driver

**Where:** `life/ui.js:2-7`. `UI.createElement()` takes no parameter, although the typedef in
`app.js:111-114` declares `(tag: string) => object` and `app.js:124` passes `'canvas'`. It
always creates a canvas, sets a `data-testid`, **and** appends it to `document.body`. The fake,
`MockUI.createElement(type)` (`tests/unit/helpers.js:14`), does honour `type`, so the fake and
the real thing implement different contracts. The fake element it returns also carries
test-only driver methods (`click`, `clickCell`, lines 47-56) alongside the fields that impersonate
the element.

**Why it's bad:**

- **Fowler: Mysterious Name.** `createElement` suggests the DOM method of the same name, which
  only creates. This one creates, tags, and attaches to the page. A reader of `initApp` can't
  tell that calling it has a visible side effect on the document.
- **Freeman & Pryce: fakes must honour the real contract.** When a test double accepts
  arguments the real object ignores, the tests describe a system that doesn't exist. Passing
  `'div'` would work in unit tests and silently produce a canvas in the browser.
- **Freeman & Pryce: name the role.** The `UI` typedef lives in `app.js` while the class lives
  in `ui.js`, and neither names what the app actually needs, which is "a surface to draw on
  that reports clicks". Once Smell 5 introduces a `Display` port, `UI` either becomes that
  port's factory or disappears.
- **SRP (in the test code):** the fake element is both a stand-in for a DOM node and a test
  driver that simulates user gestures. Driver logic (converting a cell to a click position)
  belongs in a test helper that _uses_ the fake, not inside the fake itself. Smell 1's bug
  lived in exactly that combination.

**The refactoring:**

1. **Change Function Declaration**: rename `UI.createElement()` to something honest, such as
   `createCanvas()` or `mountCanvas()`, and remove the phantom `tag` parameter from the
   typedef and the call site. Rename `MockUI.createElement(type)` to match and drop its
   parameter.
2. Move the `UI` typedef next to the class it describes (`ui.js`), or next to the new port
   from Smell 5.
3. **Extract Function** `click`/`clickCell` out of the fake element into standalone test
   helpers, e.g. `clickAt(canvas, cssPoint)` and `clickCell(canvas, viewport, cell)`. The fake
   element keeps only what it needs to impersonate (dimensions, `addEventListener`) plus one
   hook for dispatching an event.
4. After Smell 5, revisit whether `UI` still needs to exist at all, or whether the app's
   composition root (`index.html`) can create the canvas and pass it to the adapter directly.

---

### Smell 7: `rules.next` interleaves two phases, with magic numbers and vague names

**Where:** `life/rules.js:41-67`. One loop both (a) decides survival of each live cell and (b)
accumulates neighbour counts of dead cells into `counter`. A second phase, via `newCells`
(30-32), then picks births. The rule thresholds appear as `> 1 && < 4` (line 57) and `=== 3`
(line 31), none of them named. `counter` is a `{ [key: string]: number }` object used as a map,
and `newCells` names the result, not the rule.

**Why it's bad:**

- **Fowler: Long Function / Split Phase.** The survival check and the birth tally are two
  computations sharing a loop. Fowler's **Split Phase** applies when code does two things in
  sequence that could be separated by a clear intermediate structure. Here that structure is
  "live-neighbour count for every relevant cell".
- **Fowler: Mysterious Name / Comments.** The README spells out the four rules by name
  (underpopulation, survival, overpopulation, reproduction), but none of those names appear in
  the code. `liveNeighbourCount > 1 && liveNeighbourCount < 4` is the survival rule in
  disguise. Naming it (**Extract Function**: `survives(count)`, `isBorn(count)`) makes the
  code read like the spec it implements.
- **Freeman & Pryce: No String Types.** The counter is keyed by the string encoding from
  Smell 3. That leaks into `newCells`, which returns strings directly into the result set.

**The refactoring:** **Split Phase**, then **Extract Function** on the rules. Do this after
Smell 3, so it works on `Population`/`Cell`.

1. **Extract Function** `neighbourCounts(population)`: for each live cell, for each neighbour,
   increment a count. Count _all_ neighbours, live or dead, into one `Map` keyed internally
   (or a small `CellCounter` class that hides the keying, like `Population` does). This is the
   first phase.
2. **Extract Function** `survives(count)` (`count === 2 || count === 3`) and `isBorn(count)`
   (`count === 3`).
3. Rewrite `next` as the second phase: a live cell is in the result if
   `survives(counts.get(cell) ?? 0)`, and a dead cell if `isBorn(counts.get(cell))`. A cell
   with no live neighbours never appears in the counts, so isolated live cells need the `?? 0`.
4. Delete `newCells` and the ad-hoc `counter` object.
5. The existing `rules.test.js` cases cover each branch (0, 1, 2, 3, 4 neighbours, and
   births with 3 and 4), so they're a sufficient safety net for this refactoring as written.

---

### Smell 8: production modules export code that only the tests use, and the tests use it as their oracle

**Where:** `life/viewport.js:131-135` (`isBorderPixel`) and `life/viewport.js:40-44`
(`cellCentre`) have no production callers. `app.js:9-11` exports `livingCellColor`,
`deadCellColor`, `cellBorderColor`, and the only importer is `tests/e2e/helpers.js:2-6`. The e2e
helper also computes where to sample pixels using the production `cellPosition`
(`tests/e2e/helpers.js:234`).

**Verified:** `grep -rn` for each symbol across `life/` and `tests/`. `isBorderPixel` and
`cellCentre` are referenced only from `tests/`, and the colour constants are imported only by
the e2e helper.

**Why it's bad:**

- **Freeman & Pryce: tests should state expectations independently.** If the e2e test asks the
  production code "what colour is a live cell?" and "where is cell (1, 1)?", then a regression
  in either answer changes the expectation along with the behaviour, and the test can't
  notice. For example, if `livingCellColor` were accidentally set to `'#ffffff'`, every
  `isAlive()` check would test for white and still pass. The acceptance test is meant to
  describe the system from outside, so it shouldn't borrow the system's own answers.
- **Fowler: Speculative Generality / Dead Code (from production's point of view).** Functions
  in a production module that production never calls add surface that has to be kept
  consistent. `isBorderPixel` hard-codes `cellSize + cellBorderWidth / 2` as the far border
  pixel, which is a fact about how the _test_ slices image data, not about the game.
- **SRP (module level):** `viewport.js` ends up serving two clients with different needs: the
  renderer (production) and the pixel sampler (e2e).

**The refactoring:** **Move Function** into the test helpers, and state the expected values in
the tests.

1. **Move Function** `isBorderPixel` into `tests/e2e/helpers.js` (it's only called from
   there). Remove the export from `viewport.js`.
2. **Move Function** `cellCentre` into a shared test helper, or, once Smell 2 lands, keep it
   as a `Viewport` method _only if_ the production click path starts using it. Otherwise move
   it to the test side.
3. In the e2e helper, define the expected colours as literals (`const LIVE = '#ff0000'`,
   etc.) instead of importing them. A deliberate colour change should require a matching test
   change.
4. For geometry, the e2e tests can reasonably keep using the production `Viewport` to find
   _where_ to sample, since hard-coding pixel offsets would be brittle. But keep at least one
   test that clicks raw coordinates (as "Clicking on the center of the canvas renders cell
   `0,0`" already does), so the mapping is pinned from outside at least once.

---

### Smell 9: e2e helper objects are built half-empty and filled in from outside

**Where:** `tests/e2e/helpers.js`. `Pixel` declares `data;` and `RenderedCell.pixel()` assigns
it after construction (lines 36-46, 89-93). `RenderedCanvas.cell()` creates a `RenderedCell`,
then assigns `posX`, `posY`, and `imgData` onto it (lines 231-241). `RenderedCell` depends on
`this.imgData` (line 111) without declaring it. `RenderedCell.hasBorderPixel(pixel)` (120-122)
just forwards to `isBorderPixel(pixel)`. `pixelData` (102-112) contains the comment "I can't
understand this calculation any more… TODO: Work out what's going on here".

**Why it's bad:**

- **Fowler: Temporary Field / Remove Setting Method.** A `RenderedCell` isn't usable until
  another class has set three fields on it, and nothing documents or enforces that. Calling
  `isAlive()` on one built directly would throw on `this.imgData.slice`. Objects should be
  valid from construction.
- **Fowler: Middle Man.** `hasBorderPixel` adds a name and a hop without adding meaning.
- **Fowler: Comments.** A comment saying the code isn't understood is a clear case for
  **Extract Function** and **Rename**. The calculation is ordinary row-major indexing:
  `getImageData` returns a `cellStep × cellStep` block row by row, so pixel (x, y) starts at
  `(y * rowWidth + x) * 4`, where `rowWidth` is `cellStep` because that's the width requested
  on line 256. Naming `rowWidth` and `bytesPerPixel` removes the mystery.

**The refactoring:**

1. **Change Function Declaration** on `RenderedCell`'s constructor to take
   `(x, y, imgData)`. Make `RenderedCanvas.cell()` fetch the image data first, then construct.
   `posX`/`posY` are only used to fetch the data, so keep them as locals in `cell()` rather than
   fields (**Inline Variable**/**Remove Setting Method**).
2. Do the same for `Pixel`: construct it with `(x, y, rgba)`.
3. **Inline Function** `hasBorderPixel` into `cellIsColor` (calling `isBorderPixel`, which Smell 8
   moves into this file).
4. In `pixelData`, **Extract Variable** `const rowWidth = cellStep` and
   `const bytesPerPixel = 4`, write the index as `(pixel.y * rowWidth + pixel.x) * bytesPerPixel`,
   and replace the TODO with one line explaining row-major order.

---

### Smell 10: unit tests repeat the same setup and hand-roll an inverse transform

**Where:** `tests/unit/life.test.js`. Five of the six tests repeat
`const cells = new Set(); const ui = new MockUI(); initApp(ui, cells); const canvas =
ui.findElement('canvas');`, and four of them repeat the `canvasCentre` calculation. The file
defines `canvasToCssX`/`canvasToCssY` (14-29), the inverse of production's `cssToCanvas`,
split into two near-identical functions. The two block comments at lines 76-78 and 100-102
are duplicates. The suite is named "User Interface" while it tests `initApp`'s click-to-cell
behaviour.

**Why it's bad:**

- **Freeman & Pryce: streamline test code.** Anything that doesn't describe the feature should
  be moved out of the test body. Here the four lines of setup outnumber the lines that state
  the scenario. GOOS also warns against applying production-strength DRY to tests, but this
  is setup noise, not duplication that aids clarity.
- **Fowler: Duplicated Code / Parameterize Function.** `canvasToCssX` and `canvasToCssY`
  differ only in which pair of dimensions they read. That's **Parameterize Function**, or,
  better, one function that converts a point.
- **Practical cost:** the setup is duplicated, so every change to `initApp`'s signature (Smells
  4, 5 and 6 all change it) means editing five tests instead of one helper.

**The refactoring:**

1. **Extract Function** `startApp()` in `tests/unit/helpers.js` (or at the top of the test
   file) returning `{ cells, canvas }`. Replace the setup in each test.
2. **Extract Function** `canvasCentreCss(canvas)` for the repeated centre calculation.
3. **Parameterize Function**: replace `canvasToCssX`/`canvasToCssY` with
   `canvasToCss(canvas, { x, y })` returning a point. Move it to `helpers.js`, where Smell 1's
   `clickCell` fix also needs it.
4. Keep one copy of the explanatory comment, next to the new helper.
5. Rename the suite to describe what it covers, e.g. `'Clicking the canvas'` (**Rename**,
   TestDox-style).

---

### Smell 11: small inaccuracies in comments and signatures

**Where:**

- `life/viewport.js:95-100`: the comment in `cellBodyPosition` has misplaced backticks
  (`` `of the cell…``, `` `added to…``), apparently from a reflow, and is hard to read.
- `life/app.js:83-84`: `cssToCanvas`'s JSDoc says it returns `number[] | undefined`, but it
  always returns a two-element array. The capitalised `XCanvas, yCanvas` also looks like a
  reflow artefact.
- `tests/unit/life.test.js:12, 24`: `@returns {number} YCss` / `XCss`, the same artefact.
- `package.json:6`: `"main": "index.js"` names a file that doesn't exist.

**Why it's bad:** **Fowler: Comments.** A comment is only useful while it's accurate, and a
wrong type annotation is worse than none, because tooling (the project runs
`eslint-plugin-jsdoc`) and readers both trust it. None of these are behavioural, but they
cost nothing to fix and get in the way of the diffs for the larger smells.

**The refactoring:** edit directly. Fix the backticks, change the return type to `number[]`
(or to the point type from Smell 2, if that lands first), fix the `@returns` names, and
remove or correct `"main"`. Remove the `// SMELL: primitive obsession` markers in `app.js` only
when Smell 3 actually removes the smell.

---

## Suggested order of work

1. **Smell 1 (tighten the vacuous test, fix `clickCell`), together with Smell 10 (extract
   unit-test setup).** Do this first because every later step relies on the unit suite as its
   safety net. Right now one test would pass whatever cell the app toggled, and that's in the
   coordinate-mapping area that Smells 2 and 5 change. The two are done together because they
   touch the same two files (`life.test.js`, `unit/helpers.js`), and Smell 1's fix needs the
   `canvasToCss` helper that Smell 10 consolidates. Extracting `startApp()` now, rather than
   last, means the `initApp` signature changes in steps 4 and 6 are edited in one helper
   instead of five tests.

2. **Smell 11 (comment/signature fixes).** No dependencies and minutes of work. Doing it now
   keeps these one-line edits out of the diffs for the structural changes, where they'd make
   review harder.

3. **Smell 2 (`Viewport` class).** This has the widest fan-out: `app.js`, `unit/helpers.js`,
   `e2e/helpers.js`, and `viewport.test.js` all call the viewport functions. Smells 5, 8, and 9
   all need to decide where geometry lives, and with `Viewport` in place that's already decided.
   Doing Smell 5 first would mean building `CanvasRenderer` against the free functions and then
   rewriting it. Smell 1's fix is also made permanent here, because the CSS/canvas distinction
   gets an explicit type.

4. **Smell 3 (`Population`), then Smell 4 (`toggle` onto `Population`).** Same new class, same
   callers (`rules.js`, `app.js`, `index.html`, both unit test files), so do them back to back.
   Smell 3 comes first because `toggle` is a method on the class Smell 3 creates. This has to
   come before Smell 5 so that the renderer's `draw(population)` port is defined in domain terms
   from the start, instead of taking a `Set<string>` that would need changing again.

5. **Smell 7 (`rules.next` Split Phase).** Right after step 4 because `rules.js` is still open
   and its tests were just rewritten to use `Population`. Doing it before Smell 3 would mean
   writing the new `neighbourCounts` against string keys and then rewriting it.

6. **Smell 5 (extract `CanvasRenderer` and a `Display` port), then Smell 6 (rename and slim
   `UI`/`MockUI`).** By now the renderer can be assembled from existing parts (`Viewport`,
   `Population`), so the extraction is mostly moving code. Smell 6 comes straight after because
   it touches the same seam (`initApp`'s parameters, `MockUI`). Smell 5's fake `Display` also
   determines what's left for `MockUI`, and doing Smell 6 first would mean slimming the fake
   and then reshaping it again. Once this step is done, Smell 4's last step (asserting on what
   was drawn rather than on the shared collection) becomes possible. Do it here.

7. **Smell 8 (move test-only code out of production), then Smell 9 (e2e helper
   construction).** Both are almost entirely in `tests/e2e/helpers.js`, so the file is opened
   once. Smell 8 goes first because moving `isBorderPixel` into this file is what lets Smell 9
   inline `hasBorderPixel` into a local call. These come last because by now `Viewport` (step 3)
   has settled which geometry is production API and which is test-only, so `cellCentre` is
   moved only once, to its final home.
