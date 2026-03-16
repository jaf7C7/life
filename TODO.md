# TODO

- [x] Test scripts.
- [ ] Add docstrings (and `prettier-jsdoc` plugin).

- [ ] **Basic Rules**
  - [ ] **Any live cell with fewer than two live neighbours dies, as if by underpopulation.**
    - [x] A lone cell with no neighbours dies.
    - [x] A lone cell with a single neighbour dies.
    - [ ] **A cell with two neighbours survives.**
  - [ ] Any live cell with two or three live neighbours lives on to the next generation.
  - [ ] Any live cell with more than three live neighbours dies, as if by overpopulation.
  - [ ] Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.

- [ ] UI
  - [ ] Cells are rendered properly on a grid.
  - [ ] Clicking a cell toggles it live/dead.
  - [ ] Click-and-drag to pan around the grid.
  - [ ] Pinch/mousewheel to zoom in/out.
  - [ ] Play/stop buttons
  - [ ] Presets for interesting patterns.
