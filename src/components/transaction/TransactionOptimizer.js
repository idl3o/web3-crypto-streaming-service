/**
 * Utility functions for optimizing transaction performance
 */

/**
 * Throttle function to limit the rate at which a function can fire
 */
export function throttle(fn, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall < delay) {
            return;
        }
        lastCall = now;
        return fn(...args);
    };
}

/**
 * Debounce function to group multiple calls into one
 */
export function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

/**
 * Create a memoized version of a function
 */
export function memoize(fn) {
    const cache = new Map();
    return function (...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

/**
 * Batch multiple DOM operations to minimize reflows and repaints
 */
export function batchDomOperations(operations) {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            operations.forEach(operation => operation());
            resolve();
        });
    });
}

/**
 * Create a lightweight virtual scroll handler for large lists
 */
export function createVirtualScroll({
    items,           // Array of all items
    container,       // Container element reference
    itemHeight,      // Height of each item
    overscan = 5,    // Number of items to render above and below visible area
    renderItem       // Function to render an item
}) {
    let visibleItems = [];
    let startIndex = 0;
    let endIndex = 0;
    let scrollTop = 0;

    function updateVisibleItems() {
        if (!container) return;

        scrollTop = container.scrollTop;
        const viewportHeight = container.clientHeight;

        startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan);

        visibleItems = items.slice(startIndex, endIndex + 1).map((item, i) => ({
            ...item,
            index: startIndex + i,
            style: {
                position: 'absolute',
                top: `${(startIndex + i) * itemHeight}px`,
                width: '100%',
                height: `${itemHeight}px`
            }
        }));
    }

    function getScrollHeight() {
        return items.length * itemHeight;
    }

    return {
        visibleItems,
        totalHeight: getScrollHeight(),
        updateVisibleItems,
        scrollTo(index) {
            if (container) {
                container.scrollTop = index * itemHeight;
            }
        }
    };
}

/**
 * Efficiently detect if an element is in the viewport
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}
