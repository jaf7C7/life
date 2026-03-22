import { expect } from 'chai';
import { test } from 'mocha';
import { next } from '../life/rules.js';

test('A cell with no neighbours dies', () => {
    const cell = '0,0';
    const cells = new Set([cell]);

    expect(next(cells)).not.to.include(cell);
});

test('A cell with one neighbour also dies', () => {
    const cell = '0,0';
    const neighbour = '1,1';
    const cells = new Set([cell, neighbour]);

    expect(next(cells)).not.to.include(cell);
});

test('A cell with two neighbours survives', () => {
    const cell = '0,0';
    const neighbours = ['-1,-1', '1,1'];
    const cells = new Set([cell, ...neighbours]);

    expect(next(cells)).to.include(cell);
});

test('A dead cell with exactly three live neighbours becomes alive', () => {
    const deadCell = '0,0';
    const liveNeighbours = ['-1,0', '-1,-1', '0,-1'];
    const cells = new Set(liveNeighbours);

    expect(next(cells)).to.include(deadCell);
});

test('A live cell with more than three live neighbours dies', () => {
    const cell = '0,0';
    const neighbours = ['-1,-1', '-1,1', '1,1', '1,-1'];
    const cells = new Set([cell, ...neighbours]);

    expect(next(cells)).not.to.include(cell);
});

test('A live cell with three live neighbours also survives', () => {
    const cell = '0,0';
    const neighbours = ['-1,0', '-1,1', '0,1'];
    const cells = new Set([cell, ...neighbours]);

    expect(next(cells)).to.include(cell);
});

test('The blinker oscillator', () => {
    // The blinker the simplest oscillator in 'Life'. It oscillates between
    // a 3-cell column and a 3-cell row, with a period of 2.
    // See: https://conways-game-of-life.fandom.com/wiki/Blinker
    const blinker = ['0,0', '0,1', '0,-1'];
    const cells = new Set(blinker);

    expect(next(next(cells))).to.deep.equal(cells);
});
