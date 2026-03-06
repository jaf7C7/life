/** Encapsulates all the browser-specific code for rendering the user-interface. */
export default class UI {
    /** Sets the document title. */
    setTitle(title) {
        document.title = title;
    }

    /**
     * Does the actual DOM manipulation work of creating an element and setting
     * event handlers, attributes and properties.
     *
     * @param {Object} element - A specification object for the element to be
     *   created.
     * @returns {HTMLElement} - The HTML element as returned by
     *   `document.createElement`.
     */
    createElement(element) {
        const e = document.createElement(element.type);
        e.setAttribute('data-testid', element['data-testid']);
        e.textContent = element.textContent;

        if (element.handleClick) {
            e.addEventListener('click', element.handleClick);
        }

        if (element.handleResize) {
            const resizeObserver = new ResizeObserver(element.handleResize);
            resizeObserver.observe(e);
        }

        document.body.appendChild(e);

        return e;
    }
}
