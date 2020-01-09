// one simple log class is a wrapper around a native `console`
function createConsoleLog() {
    return {
        error: console.error.bind(console),
        log: console.log.bind(console),
        warn: console.warn.bind(console),
    };
}
// a log class that outputs whatever the last thing was to an HTML element
function createHtmlLogReplacement(root) {
    const span = (thing) => {
        const s = createElement('span');
        s.innerHTML = thing;
        return s;
    };
    const log = (...stuff) => {
        const strings = stuff.map((thing) => {
            if (typeof thing === 'string') {
                return span(thing);
            }
            if (typeof thing === 'number') {
                return span(thing + '');
            }
            if (typeof thing === 'function') {
                return span('function');
            }
            if (!thing) {
                return span(`false like: (${thing})`);
            }
            const c = createElement('code');
            c.innerHTML = JSON.stringify(stuff, null, 4).replace('\n', '<br />');
            return c;
        });
        return strings;
    };
    const stuffToHtml = (el) => root.appendChild(el);
    return {
        error(...stuff) {
            root.innerHTML = '';
            log('❗', ...stuff).forEach(stuffToHtml);
        },
        log(...stuff) {
            root.innerHTML = '';
            return log('👍', ...stuff).forEach(stuffToHtml);
        },
        warn(...stuff) {
            root.innerHTML = '';
            return log('⚠', ...stuff).forEach(stuffToHtml);
        },
    };
}
