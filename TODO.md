# TODO

- [x] Automated test scripts.
- [x] Add docstrings (and `prettier-jsdoc` plugin).
- [x] Make order of cells unimportant (use `Set` instead of `Array`)
- [x] Clearer assertions: `expect(next(cells)).not.toContain(cell)`

- [x] Basic Rules
  - [x] Any live cell with fewer than two live neighbours dies, as if by underpopulation.
    - [x] A lone cell with no neighbours dies.
    - [x] A lone cell with a single neighbour dies.
  - [x] Any live cell with two or three live neighbours lives on to the next generation.
    - [x] A cell with two neighbours survives.
    - [x] A cell with three neighbours also survives.
  - [x] Any live cell with more than three live neighbours dies, as if by overpopulation.
  - [x] Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
  - [x] Blinker oscillator

- [ ] **UI**
  - [x] Clicking a cell on the canvas toggles it live/dead.
  - [ ] **Click-and-drag to pan around the grid.**
    - [x] Remove non-functioning code
    - [ ] **Refactor to eliminate code smells (see 'refactoring_notes.md')**
      - [ ] **Smell 1: `Cell` mixes domain identity with display constants (`life/cell.js`)**
      - [ ] Smell 2: `rules.js` imports `Cell` — a display class (`life/rules.js`)
      - [ ] Smell 3: Coordinate math duplicated across three files
      - [ ] Smell 4: `createClickHandler` has an unused parameter (`life/app.js:54`)
      - [ ] Smell 5: `originX` / `originY` are a Data Clump (`life/app.js`)
      - [ ] Smell 6: `RenderedCell extends Cell` (`tests/e2e/helpers.js:60`)
      - [ ] Smell 7: Post-construction mutation in `RenderedCanvas.cell()` (`tests/e2e/helpers.js:241`)
      - [ ] Smell 8: `isAlive()` and `isDead()` duplicate their structure (`tests/e2e/helpers.js:109–135`)
      - [ ] Smell 9: Duplicate setup in unit tests (`tests/unit/life.test.js`)
  - [ ] Pinch/mousewheel to zoom in/out.
  - [ ] Play/stop buttons
  - [ ] Presets for interesting patterns.
