import { expect } from 'chai';
import { suite, test } from 'mocha';

function initApp(createElement) {
    createElement('canvas');
}

suite('User Interface', () => {
    test('A canvas element is created', () => {
        let elementCreated;

        function createElement(type) {
            elementCreated = type;
        }

        initApp(createElement);

        expect(elementCreated).to.equal('canvas');
    });
});
