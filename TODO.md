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
    - [ ] **Refactor to eliminate code smells (see 'smell_audit.md')**
      - [ ] M3 - if `initApp` calls `ui.createElement('div')` instead of `'canvas'`, then 3 unit tests fail, and all e2e tests pass. this should break something.
      - [ ] M5 - if `cellBorderWidth` is changed to a higher value than `2`, then 3/4 e2e tests fail erroneously. `isBorderPixel` quietly assumes a 2-pixel border.
        - changing the border width like this should arguably cause an acceptance test to fail, as we are changing the appearance of the app and that needs approval
        - `isBorderPixel` is production code but it's only used in the e2e test helpers, it probably needs to be split, and some code returned to the helpers
        - the e2e tests fail without giving informative error messages, this should be remedied as per GOOS
      - [ ] `pixelData` needs refactoring to make it exactly clear what is happening (Extract Variable/Function).
      - [ ] M9 - if `cellAtPosition` doesn't invert the `y` co-ord then all the unit tests still pass.
        - fix: assert `to.deep.equal(new Set(['1,1']))` in "Clicking on a cell twice leaves it dead"; the weak assertion allowed this mutation to survive
      - [ ] `visibleCells` needs looking at again
        - there is no need for `visibleCells` to use `ceil` instead of `floor`
          - you aren't calculating the total number of cells to paint, but calculating how many cell width-or-heights you want to move right or up before painting a new cell *from the top-left corner*
          - example:
            - (300 − 139) / 22 = 7.32, so floor gives 7 and ceil gives 8.
            - Cell 7 spans x 293–315, so it's partly visible and needed.
            - Cell 8 starts at x 315, entirely past the right edge at 300.
            - The loop is inclusive (x <= maxX), so floor already covers the partly visible cell 7. ceil adds cell 8, which is always off-canvas.
        - does `visibleCells` need to paint a margin at all? remove the margin, and if the tests pass then try to write a test which will fail.
        - M11 - if `visibleCells` does not paint the leftmost visible column then *all* the e2e tests still pass
      - [ ] We need a new test in `tests/unit/rules.js`: "A dead cell with less than three live neighbours stays dead"
      - [ ] JSDoc for `getOrigin` says it returns the co-ords of the centre of cell `0,0` but *it actually returns the cell's top left corner*

  - [ ] Make sure all tests fail with an informative error message
  - [ ] Add acceptance tests
  - [ ] Pinch/mousewheel to zoom in/out.
  - [ ] Play/stop buttons
  - [ ] Presets for interesting patterns.
    - decide whether +y upwards is a requirement, and if so pin it with a test
