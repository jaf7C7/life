export class UI {
    createElement() {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('data-testid', 'canvas');
        document.body.appendChild(canvas);
        return canvas;
    }
}
