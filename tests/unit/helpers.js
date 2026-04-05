export class UI {
    constructor() {
        this.elements = [];
    }

    createElement(type) {
        const element = {
            type,
            width: 100,
            height: 100,
            _handlers: {},
            addEventListener(event, handler) {
                this._handlers[event] = handler;
            },
            click({ x, y }) {
                this._handlers['click']?.({ offsetX: x, offsetY: y });
            },
            getContext() {
                return { fillRect() {} };
            }
        };
        this.elements.push(element);
        return element;
    }

    findElement(type) {
        return this.elements.find((e) => e.type === type);
    }
}
