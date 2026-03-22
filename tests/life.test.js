import { expect } from 'chai';
import { describe, it } from 'mocha';

function initApp(createElement) {
    createElement('canvas');
}

describe('User Interface', () => {
    it('A canvas element is created', () => {
        let elementCreated;

        function createElement(type) {
            elementCreated = type;
        }

        initApp(createElement);

        expect(elementCreated).to.equal('canvas');
    });
});
